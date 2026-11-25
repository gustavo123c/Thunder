import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { currentWeekTotals } from '@/domain/insights/comparison';
import type { RunRecord } from '@/domain/types/run';
import { formatDistanceKm, formatDuration } from '@/lib/format';

/** "Esta semana": totals from the runs already loaded (the first page covers a week). */
export function WeekSummary({ runs }: { runs: readonly RunRecord[] }) {
  const totals = useMemo(() => currentWeekTotals(runs, new Date()), [runs]);

  return (
    <View className="gap-3 rounded-3xl bg-ink-900 p-5 dark:bg-ink-800">
      <Text className="text-sm font-semibold uppercase tracking-wider text-bolt-400">
        Esta semana
      </Text>
      <View className="flex-row">
        {[
          { label: 'Distância', value: formatDistanceKm(totals.distanceM) },
          { label: 'Corridas', value: totals.runs.toString() },
          { label: 'Tempo', value: formatDuration(totals.movingTimeS) },
        ].map((item) => (
          <View key={item.label} className="flex-1 gap-0.5">
            <Text
              className="text-2xl font-bold text-ink-50"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {item.value}
            </Text>
            <Text className="text-xs text-ink-300">{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
