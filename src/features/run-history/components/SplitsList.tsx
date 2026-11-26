import { Text, View } from 'react-native';

import type { Split } from '@/domain/types/run';
import { formatPaceValue } from '@/lib/format';

/**
 * Per-km table with a bar proportional to speed (longer = faster), so pacing
 * strategy — even, positive or negative split — is visible at a glance.
 */
export function SplitsList({ splits }: { splits: readonly Split[] }) {
  if (splits.length === 0) return null;

  const paces = splits.map((s) => s.paceSPerKm);
  const fastest = Math.min(...paces);
  const slowest = Math.max(...paces);
  const fullSplits = splits.filter((s) => s.distanceM >= 999);
  const bestIndex =
    fullSplits.length > 1
      ? fullSplits.reduce((best, s) => (s.paceSPerKm < best.paceSPerKm ? s : best)).index
      : null;

  return (
    <View className="gap-3">
      <Text className="text-lg font-bold text-ink-50">Parciais</Text>
      <View className="flex-row px-1">
        <Text className="w-12 text-xs font-semibold text-ink-400">KM</Text>
        <Text className="w-16 text-xs font-semibold text-ink-400">PACE</Text>
        <View className="flex-1" />
        <Text className="w-14 text-right text-xs font-semibold text-ink-400">ELEV.</Text>
      </View>
      {splits.map((split) => {
        // 40%–100% width: slowest split still has a visible bar.
        const ratio = slowest === fastest ? 1 : (slowest - split.paceSPerKm) / (slowest - fastest);
        const width = `${40 + ratio * 60}%` as const;
        const isPartial = split.distanceM < 999;
        const label = isPartial
          ? (split.distanceM / 1000).toFixed(2).replace('.', ',')
          : `${split.index + 1}`;
        return (
          <View
            key={split.index}
            accessible
            accessibilityLabel={`Quilômetro ${label}: pace ${formatPaceValue(split.paceSPerKm)} por quilômetro`}
            className="flex-row items-center px-1"
          >
            <Text className="w-12 text-base text-ink-200">{label}</Text>
            <Text
              className="w-16 text-base font-semibold text-ink-50"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {formatPaceValue(split.paceSPerKm)}
            </Text>
            <View className="h-3 flex-1 justify-center">
              <View
                className={`h-3 rounded-full ${split.index === bestIndex ? 'bg-bolt-500' : 'bg-ink-600'}`}
                style={{ width }}
              />
            </View>
            <Text className="w-14 text-right text-sm text-ink-300">
              {split.elevationDeltaM === null
                ? '--'
                : `${split.elevationDeltaM > 0 ? '+' : ''}${Math.round(split.elevationDeltaM)} m`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
