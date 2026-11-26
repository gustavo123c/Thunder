import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import {
  type BodyRegion,
  type BodySide,
  type BodyView,
  describeRegion,
  painLevel,
  type PainLevel,
} from '@/domain/health/body-regions';
import type { BodySex } from '@/domain/types/profile';
import { useThemeColors } from '@/theme/theme';
import { colors } from '@/theme/tokens';

import type { PainLog } from '../api/pain.api';
import { DRAWINGS, musclePaths, tappableRegions } from '../muscle-map';

export const PAIN_COLORS: Record<PainLevel, string> = {
  mild: colors.brand,
  moderate: '#F97316',
  severe: colors.danger,
};

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
    <View accessibilityRole="tablist" className="flex-row rounded-full bg-ink-900 p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={`rounded-full px-3.5 py-1.5 ${selected ? 'bg-ink-700' : ''}`}
          >
            <Text
              className={`text-[13px] font-semibold ${selected ? 'text-ink-50' : 'text-ink-400'}`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Anatomical body map (muscle by muscle, male/female, front/back).
 * Tap a muscle to report pain there; painful regions are colored by intensity.
 */
export function BodyMap({ sex, pains, onSelect, height = 420 }: BodyMapProps) {
  const theme = useThemeColors();
  const [view, setView] = useState<BodyView>('front');
  const [model, setModel] = useState<BodySex>(sex ?? 'male');
  const [showList, setShowList] = useState(false);

  const paths = useMemo(() => musclePaths(model, view), [model, view]);
  const regions = useMemo(() => tappableRegions(model, view), [model, view]);
  const drawing = DRAWINGS[model][view];

  const [, , vbWidth, vbHeight] = drawing.viewBox.split(' ').map(Number) as [
    number,
    number,
    number,
    number,
  ];
  const width = (height * vbWidth) / vbHeight;

  // Light slate muscles on the dark card, so the body reads clearly.
  const muscleFill = theme.isDark ? '#7C889A' : '#A9B3C1';
  const decorFill = theme.ink[500];
  const separator = theme.ink[800];

  /** Pain for a region/side; a "center" entry of a bilateral region covers both sides. */
  function painFor(region: BodyRegion, side: BodySide): PainLog | undefined {
    return (
      pains.find((p) => p.region === region && p.side === side) ??
      pains.find((p) => p.region === region && p.side === 'center')
    );
  }

  return (
    <View className="gap-3">
      <View className="items-center rounded-[20px] border border-hairline bg-ink-800 pb-4 pt-3">
        <View className="w-full flex-row flex-wrap items-center justify-between gap-2 px-3 pb-2">
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
              { value: 'male', label: 'Masculino' },
              { value: 'female', label: 'Feminino' },
            ]}
            value={model}
            onChange={setModel}
          />
        </View>
        <Svg
          width={width}
          height={height}
          viewBox={drawing.viewBox}
          accessibilityLabel={`Corpo humano ${model === 'male' ? 'masculino' : 'feminino'}, vista ${
            view === 'front' ? 'de frente' : 'de costas'
          }`}
        >
          {paths.map((path, index) => {
            if (!path.region) {
              return (
                <Path key={index} d={path.d} fill={decorFill} stroke={separator} strokeWidth={2} />
              );
            }
            const pain = painFor(path.region, path.side);
            const region = path.region;
            return (
              <Path
                key={index}
                d={path.d}
                fill={pain ? PAIN_COLORS[painLevel(pain.intensity)] : muscleFill}
                stroke={separator}
                strokeWidth={2}
                onPress={() => onSelect(region, path.side)}
              />
            );
          })}
        </Svg>
        <Text className="mt-2 px-4 text-center text-xs text-ink-400">
          {view === 'front'
            ? 'Vista de frente: o seu lado esquerdo aparece à direita da tela.'
            : 'Vista de costas: os lados coincidem com os seus.'}
        </Text>
      </View>

      {/* Accessible alternative to tapping the drawing (screen readers, small muscles). */}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: showList }}
        onPress={() => setShowList((v) => !v)}
        className="self-center"
      >
        <Text className="text-sm font-semibold text-accent">
          {showList ? 'Ocultar lista de regiões' : 'Escolher pela lista'}
        </Text>
      </Pressable>
      {showList ? (
        <View className="flex-row flex-wrap gap-2">
          {regions.map(({ region, side }) => {
            const pain = painFor(region, side);
            return (
              <Pressable
                key={`${region}:${side}`}
                accessibilityRole="button"
                accessibilityLabel={describeRegion(region, side)}
                onPress={() => onSelect(region, side)}
                className={`rounded-full border px-3 py-1.5 ${
                  pain ? 'border-hairline bg-bolt-500/10' : 'border-hairline bg-ink-800'
                }`}
              >
                <Text className="text-sm text-ink-100">{describeRegion(region, side)}</Text>
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
            <Text className="text-xs text-ink-300">
              {level === 'mild' ? 'Leve' : level === 'moderate' ? 'Moderada' : 'Forte'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
