/* eslint-disable react/no-unknown-property -- three.js JSX elements (React Three Fiber) */
import { Component, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, type GestureResponderEvent, Pressable, Text, View } from 'react-native';
import * as THREE from 'three';

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
import { PAIN_COLORS } from '../BodyMap';
import { Canvas, useFrame, useThree } from './fiber';
import { loadBodyModel } from './models';
import { isTap, zoneFromHits } from './pick';

// three's GLTFLoader decodes the .glb JSON chunk with TextDecoder.
installTextDecoder();

/** Radians turned per pixel dragged. */
const DRAG_SPEED = 0.012;
/** Camera distance at zoom 1 and the zoom range. */
const BASE_DISTANCE = 3.3;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.6;
/** Height (m) the camera looks at: whole body at zoom 1, clamped between feet and head. */
const DEFAULT_FOCUS = 0.87;
const MIN_FOCUS = 0.1;
const MAX_FOCUS = 1.65;
/** Model meters panned per pixel dragged at zoom 1. */
const PAN_SPEED = 0.004;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type CameraState = { zoom: number; focus: number };

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
  source,
  pains,
  selected,
  palette,
  rotation,
}: {
  source: THREE.Group;
  pains: readonly PainLog[];
  selected: ZoneRef | null;
  palette: Palette;
  rotation: { current: number };
}) {
  const group = useRef<THREE.Group>(null);

  // Own copy with one material per zone, so recoloring doesn't touch the cached model.
  const scene = useMemo(() => {
    const copy = source.clone(true);
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
  }, [source]);

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

/** Eases the camera toward the zoom and focus height set by the gestures. */
function CameraRig({ view }: { view: { current: CameraState } }) {
  const look = useRef(DEFAULT_FOCUS);
  useFrame(({ camera }, delta) => {
    const ease = Math.min(1, delta * 10);
    const { zoom, focus } = view.current;
    camera.position.z += (BASE_DISTANCE / zoom - camera.position.z) * ease;
    look.current += (focus - look.current) * ease;
    camera.position.y = look.current + 0.03;
    camera.lookAt(0, look.current, 0);
  });
  return null;
}

/** Exposes raycasting from screen coordinates to the touch handler outside the Canvas. */
function PickerBridge({ onReady }: { onReady: (picker: Picker | null) => void }) {
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  useEffect(() => {
    camera.lookAt(0, DEFAULT_FOCUS, 0);
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
class FailSafe extends Component<{ onError: (error: unknown) => void; children: ReactNode }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: unknown) {
    this.props.onError(error);
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
  onUnavailable: (error: unknown) => void;
  height?: number;
};

/**
 * Realistic 3D body (MakeHuman, CC0) split into runner pain zones. Drag sideways to turn
 * it around the vertical axis, pinch (or +/−) to zoom, drag vertically while zoomed to
 * move along the body; tap a zone to report pain there.
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
  const model: BodySex = sex ?? 'male';
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [size, setSize] = useState({ width: 0, height });
  const [loaded, setLoaded] = useState<{ sex: BodySex; scene: THREE.Group } | null>(null);
  const rotation = useRef(0);
  const view = useRef<CameraState>({ zoom: MIN_ZOOM, focus: DEFAULT_FOCUS });
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    let active = true;
    loadBodyModel(model).then(
      (scene) => {
        if (active) setLoaded({ sex: model, scene });
      },
      (error: unknown) => {
        if (active) onUnavailable(error);
      },
    );
    return () => {
      active = false;
    };
  }, [model, onUnavailable]);
  const source = loaded?.sex === model ? loaded.scene : null;
  const picker = useRef<Picker | null>(null);
  const gesture = useRef({
    start: 0,
    focus: DEFAULT_FOCUS,
    x: 0,
    y: 0,
    pageX: 0,
    pageY: 0,
    time: 0,
    pinchDistance: 0,
    pinchZoom: MIN_ZOOM,
    pinched: false,
  });

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
      // Zoomed in, vertical drags move along the body instead of scrolling the page.
      if (view.current.zoom > MIN_ZOOM || gesture.current.pinched) return false;
      const dx = event.nativeEvent.pageX - gesture.current.pageX;
      const dy = event.nativeEvent.pageY - gesture.current.pageY;
      return Math.abs(dy) > Math.abs(dx) * 1.5;
    },
    onResponderGrant: (event: GestureResponderEvent) => {
      const e = event.nativeEvent;
      gesture.current = {
        start: rotation.current,
        focus: view.current.focus,
        x: e.locationX,
        y: e.locationY,
        pageX: e.pageX,
        pageY: e.pageY,
        time: e.timestamp,
        pinchDistance: 0,
        pinchZoom: view.current.zoom,
        pinched: false,
      };
    },
    onResponderMove: (event: GestureResponderEvent) => {
      const e = event.nativeEvent;
      const g = gesture.current;
      const [a, b] = e.touches;
      if (a && b) {
        const distance = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
        if (!g.pinched || g.pinchDistance === 0) {
          g.pinched = true;
          g.pinchDistance = distance;
          g.pinchZoom = view.current.zoom;
          return;
        }
        view.current.zoom = clamp((g.pinchZoom * distance) / g.pinchDistance, MIN_ZOOM, MAX_ZOOM);
        return;
      }
      if (g.pinched) return; // lifting one finger after a pinch shouldn't spin the body
      rotation.current = g.start + (e.pageX - g.pageX) * DRAG_SPEED;
      if (view.current.zoom > MIN_ZOOM) {
        view.current.focus = clamp(
          g.focus + ((e.pageY - g.pageY) * PAN_SPEED) / view.current.zoom,
          MIN_FOCUS,
          MAX_FOCUS,
        );
      }
    },
    onResponderRelease: (event: GestureResponderEvent) => {
      const e = event.nativeEvent;
      const g = gesture.current;
      if (g.pinched) {
        if (view.current.zoom <= MIN_ZOOM + 0.05) resetView();
        else setZoomed(true);
        return;
      }
      if (isTap(e.pageX - g.pageX, e.pageY - g.pageY, e.timestamp - g.time)) {
        const zone = size.width > 0 ? picker.current?.(g.x, g.y, size.width, size.height) : null;
        if (zone) onSelect(zone);
        return;
      }
      setFacing(Math.abs(normalizeAngle(rotation.current)) < Math.PI / 2 ? 'front' : 'back');
    },
  };

  function flip() {
    const next = facing === 'front' ? 'back' : 'front';
    rotation.current = shortestRotation(rotation.current, viewRotation(next));
    setFacing(next);
  }

  function zoomBy(factor: number) {
    const zoom = clamp(view.current.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    if (zoom <= MIN_ZOOM) {
      resetView();
      return;
    }
    view.current.zoom = zoom;
    setZoomed(true);
  }

  function resetView() {
    view.current = { zoom: MIN_ZOOM, focus: DEFAULT_FOCUS };
    setZoomed(false);
  }

  return (
    <View className="items-center overflow-hidden rounded-[20px] border border-hairline bg-ink-800 pb-3">
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
            {source ? (
              <Model
                source={source}
                pains={pains}
                selected={selected}
                palette={palette}
                rotation={rotation}
              />
            ) : null}
            <CameraRig view={view} />
            <PickerBridge onReady={setPicker} />
          </Canvas>
        </FailSafe>
        {source ? null : (
          <View
            pointerEvents="none"
            className="absolute inset-0 items-center justify-center"
            accessibilityLabel="Carregando o corpo 3D"
          >
            <ActivityIndicator color={theme.ink[300]} />
          </View>
        )}
      </View>
      {/* Siblings of the touch area, so their taps don't reach the body's responder. */}
      <View className="absolute right-3 top-3 gap-2">
        <ViewButton
          icon="add"
          label="Aproximar"
          onPress={() => zoomBy(ZOOM_STEP)}
          testID="body-zoom-in"
        />
        <ViewButton
          icon="remove"
          label="Afastar"
          onPress={() => zoomBy(1 / ZOOM_STEP)}
          testID="body-zoom-out"
        />
        {zoomed ? (
          <ViewButton icon="scan-outline" label="Ver o corpo inteiro" onPress={resetView} />
        ) : null}
      </View>
      <View className="absolute left-3 top-3">
        <ViewButton
          icon="sync-outline"
          label={facing === 'front' ? 'Ver costas' : 'Ver frente'}
          onPress={flip}
          testID="body-flip"
        />
      </View>
      <Text className="mt-1 px-4 text-center text-xs text-ink-400">
        {zoomed
          ? 'Arraste para cima ou para baixo para percorrer o corpo.'
          : 'Toque para marcar dor · pinça para aproximar.'}
      </Text>
    </View>
  );
}

function ViewButton({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      testID={testID}
      className="h-10 w-10 items-center justify-center rounded-full border border-hairline bg-ink-900/80 active:bg-ink-700"
    >
      <Ionicons name={icon} size={18} color={theme.ink[100]} />
    </Pressable>
  );
}
