import { Text, View } from 'react-native';

import { StatBlock } from '@/components/ui/StatBlock';
import { formatDistanceKm, formatDuration, formatPaceValue } from '@/lib/format';

import type { LiveMetrics } from '../hooks/useLiveMetrics';

export function LiveStats({ metrics, paused }: { metrics: LiveMetrics; paused: boolean }) {
  return (
    <View className="gap-5">
      {paused ? (
        <View className="self-center rounded-full bg-bolt-500 px-3 py-1">
          <Text className="text-xs font-bold uppercase tracking-wider text-ink-900">Pausado</Text>
        </View>
      ) : null}

      <StatBlock
        size="hero"
        label="Distância (km)"
        value={formatDistanceKm(metrics.distanceM).replace(' km', '')}
      />

      <View className="flex-row justify-around">
        <StatBlock label="Tempo" value={formatDuration(metrics.activeTimeS)} />
        <StatBlock label="Pace atual" value={formatPaceValue(metrics.currentPaceSPerKm)} />
      </View>

      <View className="flex-row justify-around">
        <StatBlock
          size="medium"
          label="Pace médio"
          value={formatPaceValue(metrics.avgPaceSPerKm)}
        />
        <StatBlock
          size="medium"
          label="Calorias"
          value={metrics.caloriesKcal === null ? '--' : Math.round(metrics.caloriesKcal).toString()}
        />
      </View>
    </View>
  );
}
