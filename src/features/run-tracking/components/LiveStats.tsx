import { Text, View } from 'react-native';

import { StatBlock } from '@/components/ui/StatBlock';
import { formatDistanceKm, formatDuration, formatPaceTrack } from '@/lib/format';

import type { LiveMetrics } from '../hooks/useLiveMetrics';

type LiveStatsProps = {
  metrics: LiveMetrics;
  /** 'idle' shows the ready indicators (00:00 · 0,00 km · --'--). */
  status: 'idle' | 'running' | 'paused';
};

/** Run metrics panel: big tabular numbers, labels small and muted. */
export function LiveStats({ metrics, status }: LiveStatsProps) {
  const distance = formatDistanceKm(metrics.distanceM).replace(' km', '');

  if (status === 'idle') {
    return (
      <View className="flex-row justify-between px-2">
        <StatBlock size="medium" label="Tempo" value="00:00" />
        <StatBlock size="medium" label="Distância" value={distance} unit="km" />
        <StatBlock size="medium" label="Pace" value={formatPaceTrack(null)} />
      </View>
    );
  }

  return (
    <View className="gap-5">
      {status === 'paused' ? (
        <View className="self-center rounded-full border border-bolt-500/40 bg-bolt-500/10 px-3 py-1">
          <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-bolt-500">
            Pausado
          </Text>
        </View>
      ) : null}

      <StatBlock size="hero" label="Distância" value={distance} unit="km" />

      <View className="flex-row justify-between px-2">
        <StatBlock size="medium" label="Tempo" value={formatDuration(metrics.activeTimeS)} />
        <StatBlock
          size="medium"
          label="Pace atual"
          value={formatPaceTrack(metrics.currentPaceSPerKm)}
          accent
        />
        <StatBlock
          size="medium"
          label="Pace médio"
          value={formatPaceTrack(metrics.avgPaceSPerKm)}
        />
      </View>

      <Text className="text-center text-xs text-ink-400">
        {metrics.caloriesKcal === null
          ? 'Calorias: informe seu peso no perfil'
          : `${Math.round(metrics.caloriesKcal)} kcal estimadas`}
      </Text>
    </View>
  );
}
