/* eslint-disable react/no-unknown-property -- three.js JSX elements (React Three Fiber) */
import { Component, type ReactNode, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { type GestureResponderEvent, Text, View } from 'react-native';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { painLevel } from '@/domain/health/body-regions';
import {
  normalizeAngle,
  shortestRotation,
  viewRotation,
  type ZoneRef,
  zoneName,
} from '@/domain/health/body-zones';
import type { BodySex } from '@/domain/types/profile';
import { installTextDecoder } from '@/lib/polyfills/text-decoder';
import { useThemeColors } from '@/theme/theme';
import { colors } from '@/theme/tokens';

import type { PainLog } from '../../api/pain.api';
import { PAIN_COLORS, Toggle } from '../BodyMap';
import { Canvas, useFrame, useLoader, useThree } from './fiber';
import { modelSource } from './models';
import { isTap, zoneFromHits } from './pick';

// three's GLTFLoader decodes the .glb JSON chunk with TextDecoder.
installTextDecoder();

/** Radians turned per pixel dragged. */
const DRAG_SPEED = 0.012;

type Picker = (x: number, y: number, width: number, height: number) => ZoneRef | null;

type Palette = { body: string; zone: string };

/** Pain color for a zone; a "center" pain of a bilateral region paints both sides. */
function zoneColor(pains: readonly PainLog[], name: string): string | null {
  const pain = pains.find(
    (p) =>
      zoneName(p) === name ||
      (p.side === 'center' && name.startsWith(`zone_${p.region}_`) && !name.endsWith('_center')),
  );
  return pain ? PAIN_COLORS[painLevel(pain.intensity)] : null;
}

function Model({
  sex,
  pains,
  selected,
  palette,
  rotation,
}: {
  sex: BodySex;
  pains: readonly PainLog[];
  selected: ZoneRef | null;
  palette: Palette;
  rotation: { current: number };
}) {
  const gltf = useLoader(GLTFLoader, modelSource(sex) as string);
  const group = useRef<THREE.Group>(null);

  // Own copy with one material per zone, so recoloring doesn't touch the cached model.
  const scene = useMemo(() => {
    const copy = gltf.scene.clone(true);
    copy.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const source = node.material as THREE.Material;
      node.userData.zone = source.name.startsWith('zone_') ? source.name : undefined;
      node.material = new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0 });
    });
    const box = new THREE.Box3().setFromObject(copy);
    const center = box.getCenter(new THREE.Vector3());
    copy.position.set(-center.x, -box.min.y, -center.z); // feet on the floor, spin in place
    return copy;
  }, [gltf]);

  useEffect(() => {
    const selectedName = selected ? zoneName(selected) : null;
    scene.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const material = node.material as THREE.MeshStandardMaterial;
      const name = node.userData.zone as string | undefined;
      const pain = name ? zoneColor(pains, name) : null;
      material.color.set(pain ?? (name ? palette.zone : palette.body));
      const isSelected = name !== undefined && name === selectedName;
      material.emissive.set(isSelected ? colors.brand : '#000000');
      material.emissiveIntensity = isSelected ? 0.45 : 0;
    });
  }, [scene, pains, selected, palette]);

  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;
    const diff = rotation.current - node.rotation.y;
    node.rotation.y += Math.abs(diff) < 1e-4 ? diff : diff * Math.min(1, delta * 12);
  });

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

/** Exposes raycasting from screen coordinates to the touch handler outside the Canvas. */
function PickerBridge({ onReady }: { onReady: (picker: Picker | null) => void }) {
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  useEffect(() => {
    camera.lookAt(0, 0.87, 0);
    const raycaster = new THREE.Raycaster();
    onReady((x, y, width, height) => {
      raycaster.setFromCamera(
        new THREE.Vector2((x / width) * 2 - 1, -(y / height) * 2 + 1),
        camera,
      );
      return zoneFromHits(raycaster.intersectObjects(scene.children, true));
    });
    return () => onReady(null);
  }, [camera, scene, onReady]);
  return null;
}

/** Any failure (no WebGL, model not loaded) hands the screen back to the 2D map. */
class FailSafe extends Component<{ onError: () => void; children: ReactNode }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch() {
    this.props.onError();
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

type Body3DProps = {
  sex: BodySex | null;
  pains: readonly PainLog[];
  selected: ZoneRef | null;
  onSelect: (zone: ZoneRef) => void;
  /** The 3D view can't run here: show the 2D map instead. */
  onUnavailable: () => void;
  height?: number;
};

/**
 * Realistic 3D body (MakeHuman, CC0) split into runner pain zones. Drag sideways to turn
 * it around the vertical axis; tap a zone to report pain there.
 */
export function Body3D({
  sex,
  pains,
  selected,
  onSelect,
  onUnavailable,
  height = 420,
}: Body3DProps) {
  const theme = useThemeColors();
  const [model, setModel] = useState<BodySex>(sex ?? 'male');
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [size, setSize] = useState({ width: 0, height });
  const rotation = useRef(0);
  const picker = useRef<Picker | null>(null);
  const gesture = useRef({ start: 0, x: 0, y: 0, pageX: 0, pageY: 0, time: 0 });

  const palette = useMemo<Palette>(
    () =>
      theme.isDark ? { body: '#4F5867', zone: '#838D9D' } : { body: '#C6CCD5', zone: '#9AA4B2' },
    [theme.isDark],
  );

  const [setPicker] = useState(() => (next: Picker | null) => {
    picker.current = next;
  });

  // Touch handling with the plain responder props (refs are only touched in handlers).
  const touch = {
    // Claim touches before the GL view; give vertical drags back to the scroll view.
    onStartShouldSetResponderCapture: () => true,
    onResponderTerminationRequest: (event: GestureResponderEvent) => {
      const dx = event.nativeEvent.pageX - gesture.current.pageX;
      const dy = event.nativeEvent.pageY - gesture.current.pageY;
      return Math.abs(dy) > Math.abs(dx) * 1.5;
    },
    onResponderGrant: (event: GestureResponderEvent) => {
      const e = event.nativeEvent;
      gesture.current = {
        start: rotation.current,
        x: e.locationX,
        y: e.locationY,
        pageX: e.pageX,
        pageY: e.pageY,
        time: e.timestamp,
      };
    },
    onResponderMove: (event: GestureResponderEvent) => {
      rotation.current =
        gesture.current.start + (event.nativeEvent.pageX - gesture.current.pageX) * DRAG_SPEED;
    },
    onResponderRelease: (event: GestureResponderEvent) => {
      const e = event.nativeEvent;
      const g = gesture.current;
      if (isTap(e.pageX - g.pageX, e.pageY - g.pageY, e.timestamp - g.time)) {
        const zone = size.width > 0 ? picker.current?.(g.x, g.y, size.width, size.height) : null;
        if (zone) onSelect(zone);
        return;
      }
      setFacing(Math.abs(normalizeAngle(rotation.current)) < Math.PI / 2 ? 'front' : 'back');
    },
  };

  function turnTo(view: 'front' | 'back') {
    rotation.current = shortestRotation(rotation.current, viewRotation(view));
    setFacing(view);
  }

  return (
    <View className="items-center rounded-[20px] border border-hairline bg-ink-800 pb-4 pt-3">
      <View className="w-full flex-row flex-wrap items-center justify-between gap-2 px-3 pb-2">
        <Toggle
          options={[
            { value: 'front', label: 'Frente' },
            { value: 'back', label: 'Costas' },
          ]}
          value={facing}
          onChange={turnTo}
        />
        <Toggle
          options={[
            { value: 'male', label: 'Masculino' },
            { value: 'female', label: 'Feminino' },
          ]}
          value={model}
          onChange={setModel}
        />
      </View>
      <View
        testID="body-3d"
        accessible
        accessibilityLabel={`Corpo 3D ${model === 'male' ? 'masculino' : 'feminino'}. Use a lista de regiões para marcar dores com o leitor de tela.`}
        style={{ width: '100%', height }}
        onLayout={(e) => setSize(e.nativeEvent.layout)}
        {...touch}
      >
        <FailSafe onError={onUnavailable}>
          <Canvas camera={{ position: [0, 0.9, 3.3], fov: 30, near: 0.1, far: 20 }}>
            <hemisphereLight args={['#ffffff', '#3a3f4a', 1.1]} />
            <directionalLight position={[1.5, 2.5, 3]} intensity={1.6} />
            <directionalLight position={[-2, 1.5, -2.5]} intensity={0.6} />
            <Suspense fallback={null}>
              <Model
                sex={model}
                pains={pains}
                selected={selected}
                palette={palette}
                rotation={rotation}
              />
            </Suspense>
            <PickerBridge onReady={setPicker} />
          </Canvas>
        </FailSafe>
      </View>
      <Text className="mt-2 px-4 text-center text-xs text-ink-400">
        Arraste para os lados para girar. Toque em uma região para marcar dor.
      </Text>
    </View>
  );
}
