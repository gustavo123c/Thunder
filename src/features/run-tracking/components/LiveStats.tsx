import { Text, View } from 'react-native';

import { Lanes } from '@/components/ui/Lanes';
import { StatBlock } from '@/components/ui/StatBlock';
import {
  formatDistanceKm,
  formatDuration,
  formatPaceDiffTrack,
  formatPaceTrack,
} from '@/lib/format';

import type { LiveMetrics } from '../hooks/useLiveMetrics';

type LiveStatsProps = {
  metrics: LiveMetrics;
  /** 'idle' shows the ready indicators (00:00 · 0,00 km · --'--). */
  status: 'idle' | 'running' | 'paused';
};

/** The last completed laps ("voltas") with the difference to the lap before. */
function Laps({ paces }: { paces: readonly number[] }) {
  const recent = paces
    .map((pace, index) => ({
      lap: index + 1,
      pace,
      diff: index > 0 ? pace - paces[index - 1]! : null,
    }))
    .slice(-2)
    .reverse();
  if (recent.length === 0) return null;
  return (
    <View className="gap-2">
      <Lanes />
      {recent.map(({ lap, pace, diff }, i) => (
        <View
          key={lap}
          accessible
          accessibilityLabel={`Volta ${lap}: ${formatPaceTrack(pace)} por quilômetro`}
          className="flex-row items-center justify-between"
        >
          <Text
            className={`font-mono-medium text-[13px] ${i === 0 ? 'text-ink-200' : 'text-ink-400'}`}
          >
            VOLTA {String(lap).padStart(2, '0')}
          </Text>
          <Text
            className={`font-mono-medium text-[13px] ${i === 0 ? 'text-ink-50' : 'text-ink-400'}`}
          >
            {formatPaceTrack(pace)}
          </Text>
          <Text
            className={`w-20 text-right font-mono-medium text-[13px] ${
              diff !== null && diff < 0 && i === 0 ? 'text-success' : 'text-ink-400'
            }`}
          >
            {diff === null ? '—' : formatPaceDiffTrack(diff)}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Run panel in stopwatch type: huge distance, three metrics and the latest laps. */
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
    <View className="gap-4">
      {status === 'paused' ? (
        <View className="self-start rounded-md bg-ink-700 px-2.5 py-1">
          <Text className="font-mono-medium text-[11px] uppercase tracking-[1.6px] text-ink-200">
            Pausado
          </Text>
        </View>
      ) : null}

      <StatBlock size="hero" align="left" label="Distância" value={distance} unit="km" />

      <View className="flex-row justify-between">
        <StatBlock
          size="medium"
          align="left"
          label="Tempo"
          value={formatDuration(metrics.activeTimeS)}
        />
        <StatBlock
          size="medium"
          align="left"
          label="Pace atual"
          value={formatPaceTrack(metrics.currentPaceSPerKm)}
          accent
        />
        <StatBlock
          size="medium"
          align="left"
          label="Pace médio"
          value={formatPaceTrack(metrics.avgPaceSPerKm)}
        />
      </View>

      <Laps paces={metrics.lapPacesSPerKm} />

      <Text className="font-mono-medium text-[11px] text-ink-400">
        {metrics.caloriesKcal === null
          ? 'Calorias: informe seu peso no perfil'
          : `${Math.round(metrics.caloriesKcal)} kcal estimadas`}
      </Text>
    </View>
  );
}
