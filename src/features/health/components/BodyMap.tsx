import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import {
  type BodyRegion,
  type BodySide,
  type BodyView,
  describeRegion,
  painLevel,
} from '@/domain/health/body-regions';
import type { BodySex } from '@/domain/types/profile';
import { colors } from '@/theme/tokens';

import type { PainLog } from '../api/pain.api';
import { BODY_VIEWBOX, bodyHotspots, type Hotspot, silhouette } from '../body-geometry';

const SKIN = colors.ink[100];
const OUTLINE = colors.ink[300];

const PAIN_COLORS = {
  mild: colors.bolt[400],
  moderate: '#F97316',
  severe: colors.danger,
} as const;

type BodyMapProps = {
  sex: BodySex | null;
  pains: readonly PainLog[];
  onSelect: (region: BodyRegion, side: BodySide) => void;
  height?: number;
};

function Toggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View
      accessibilityRole="tablist"
      className="flex-row rounded-xl bg-ink-100 p-1 dark:bg-ink-900"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={`rounded-lg px-3 py-1.5 ${selected ? 'bg-white dark:bg-ink-700' : ''}`}
          >
            <Text
              className={`text-sm font-semibold ${selected ? 'text-ink-900 dark:text-ink-50' : 'text-ink-400'}`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Interactive front/back body map. Tap a region to report pain there. */
export function BodyMap({ sex, pains, onSelect, height = 380 }: BodyMapProps) {
  const [view, setView] = useState<BodyView>('front');
  const [model, setModel] = useState<BodySex>(sex ?? 'male');
  const [showList, setShowList] = useState(false);

  const hotspots = useMemo(() => bodyHotspots(model, view), [model, view]);
  const shape = useMemo(() => silhouette(model, view), [model, view]);
  const painByKey = useMemo(() => new Map(pains.map((p) => [`${p.region}:${p.side}`, p])), [pains]);

  const width = (height * BODY_VIEWBOX.width) / BODY_VIEWBOX.height;

  function renderHotspot(hotspot: Hotspot) {
    const pain = painByKey.get(hotspot.key);
    const fill = pain ? PAIN_COLORS[painLevel(pain.intensity)] : colors.ink[400];
    const common = {
      fill,
      fillOpacity: pain ? 0.85 : 0.06,
      stroke: pain ? fill : colors.ink[400],
      strokeOpacity: pain ? 1 : 0.55,
      strokeWidth: pain ? 1.2 : 0.8,
      strokeDasharray: pain ? undefined : '2 2',
      onPress: () => onSelect(hotspot.region, hotspot.side),
    };
    const label = `${describeRegion(hotspot.region, hotspot.side)}${pain ? ', com dor registrada' : ''}`;
    return hotspot.shape.kind === 'circle' ? (
      <Circle
        key={hotspot.key}
        {...common}
        accessibilityLabel={label}
        cx={hotspot.shape.cx}
        cy={hotspot.shape.cy}
        r={hotspot.shape.r}
      />
    ) : (
      <Ellipse
        key={hotspot.key}
        {...common}
        accessibilityLabel={label}
        cx={hotspot.shape.cx}
        cy={hotspot.shape.cy}
        rx={hotspot.shape.rx}
        ry={hotspot.shape.ry}
      />
    );
  }

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <Toggle
          options={[
            { value: 'front', label: 'Frente' },
            { value: 'back', label: 'Costas' },
          ]}
          value={view}
          onChange={setView}
        />
        <Toggle
          options={[
            { value: 'male', label: 'Masc.' },
            { value: 'female', label: 'Fem.' },
          ]}
          value={model}
          onChange={setModel}
        />
      </View>

      <View className="items-center rounded-3xl bg-white py-4 dark:bg-ink-800">
        <Svg
          width={width}
          height={height}
          viewBox={`0 0 ${BODY_VIEWBOX.width} ${BODY_VIEWBOX.height}`}
          accessibilityLabel={`Mapa corporal, vista ${view === 'front' ? 'de frente' : 'de costas'}`}
        >
          {/* Mannequin */}
          {shape.limbs.map((d, i) => (
            <Path key={`limb-${i}`} d={d} fill={SKIN} stroke={OUTLINE} strokeWidth={1} />
          ))}
          {shape.extremities.map((e, i) => (
            <Ellipse key={`ext-${i}`} {...e} fill={SKIN} stroke={OUTLINE} strokeWidth={1} />
          ))}
          <Rect {...shape.neck} rx={4} fill={SKIN} stroke={OUTLINE} strokeWidth={1} />
          <Path d={shape.torso} fill={SKIN} stroke={OUTLINE} strokeWidth={1} />
          <Ellipse {...shape.head} fill={SKIN} stroke={OUTLINE} strokeWidth={1} />
          {shape.details.map((d, i) => (
            <Path
              key={`detail-${i}`}
              d={d}
              fill="none"
              stroke={OUTLINE}
              strokeWidth={0.8}
              strokeOpacity={0.6}
            />
          ))}
          {/* Tappable regions */}
          {hotspots.map(renderHotspot)}
        </Svg>
        <Text className="mt-2 text-xs text-ink-400">
          {view === 'front'
            ? 'Vista de frente: seu lado esquerdo fica à direita da tela'
            : 'Vista de costas'}
        </Text>
      </View>

      {/* Accessible alternative to tapping the drawing (screen readers, small targets). */}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: showList }}
        onPress={() => setShowList((v) => !v)}
        className="self-center"
      >
        <Text className="text-sm font-semibold text-bolt-600">
          {showList ? 'Ocultar lista de regiões' : 'Escolher pela lista'}
        </Text>
      </Pressable>
      {showList ? (
        <View className="flex-row flex-wrap gap-2">
          {hotspots.map((hotspot) => {
            const pain = painByKey.get(hotspot.key);
            return (
              <Pressable
                key={hotspot.key}
                accessibilityRole="button"
                accessibilityLabel={describeRegion(hotspot.region, hotspot.side)}
                onPress={() => onSelect(hotspot.region, hotspot.side)}
                className={`rounded-full px-3 py-1.5 ${
                  pain ? 'bg-bolt-100 dark:bg-ink-600' : 'bg-ink-100 dark:bg-ink-700'
                }`}
              >
                <Text className="text-sm text-ink-800 dark:text-ink-100">
                  {describeRegion(hotspot.region, hotspot.side)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View className="flex-row justify-center gap-4">
        {(['mild', 'moderate', 'severe'] as const).map((level) => (
          <View key={level} className="flex-row items-center gap-1.5">
            <View
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: PAIN_COLORS[level] }}
            />
            <Text className="text-xs text-ink-500 dark:text-ink-300">
              {level === 'mild' ? 'Leve' : level === 'moderate' ? 'Moderada' : 'Forte'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
