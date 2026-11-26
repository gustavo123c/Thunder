import { type ReactNode, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { comparePeriods, type Period } from '@/domain/insights/activity';
import { formatDistanceKm, formatDuration, formatPace } from '@/lib/format';

import { useActivity } from '../hooks/useActivity';
import { describeProgress, formatPercent, PERIOD_LABELS } from '../progress-copy';

const PERIODS: Period[] = ['day', 'week', 'month', 'year'];

const toneText = {
  positive: 'text-success',
  negative: 'text-danger',
  neutral: 'text-ink-300',
} as const;

function DeltaBadge({
  value,
  invertColors = false,
}: {
  value: number | null;
  invertColors?: boolean;
}) {
  if (value === null) return <Text className="text-xs text-ink-400">sem comparação</Text>;
  const good = invertColors ? value < 0 : value > 0;
  const color = value === 0 ? 'text-ink-400' : good ? 'text-success' : 'text-danger';
  return <Text className={`text-sm font-bold ${color}`}>{formatPercent(value)}</Text>;
}

function Metric({ label, value, delta }: { label: string; value: string; delta: ReactNode }) {
  return (
    <View className="flex-1 gap-1">
      <Text className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
        {label}
      </Text>
      <Text
        className="text-[28px] font-extrabold leading-tight text-ink-50"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {value}
      </Text>
      {delta}
    </View>
  );
}

/** Day/week/month/year performance vs the previous period, with an evolution message. */
export function ProgressDashboard({ userId }: { userId: string }) {
  const [period, setPeriod] = useState<Period>('week');
  const activity = useActivity(userId);

  const comparison = useMemo(
    () => (activity.data ? comparePeriods(activity.data, period, new Date()) : null),
    [activity.data, period],
  );

  return (
    <View className="gap-4 rounded-[20px] border border-hairline bg-ink-800 p-4">
      <Text className="text-lg font-extrabold text-ink-50">Desempenho</Text>

      <View accessibilityRole="tablist" className="flex-row rounded-2xl bg-ink-900 p-1">
        {PERIODS.map((p) => {
          const selected = p === period;
          return (
            <Pressable
              key={p}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setPeriod(p)}
              className={`flex-1 items-center rounded-xl py-2 ${selected ? 'bg-bolt-500' : ''}`}
            >
              <Text
                className={`text-sm font-semibold ${selected ? 'text-onbolt' : 'text-ink-300'}`}
              >
                {PERIOD_LABELS[p]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!comparison ? (
        activity.isError ? (
          <Text className="text-sm text-danger">Não foi possível carregar seu desempenho.</Text>
        ) : (
          <View className="gap-3">
            <Skeleton height={56} />
            <Skeleton height={20} width="70%" />
          </View>
        )
      ) : (
        <>
          <View className="flex-row gap-3">
            <Metric
              label="Pace médio"
              value={formatPace(comparison.current.avgPaceSPerKm)}
              delta={<DeltaBadge value={comparison.paceImprovementPct} />}
            />
            <Metric
              label="Distância"
              value={formatDistanceKm(comparison.current.distanceM)}
              delta={<DeltaBadge value={comparison.distanceChangePct} />}
            />
            <Metric
              label="Treinos"
              value={String(comparison.current.runs)}
              delta={
                <Text className="text-xs text-ink-400">
                  {comparison.runsChange >= 0 ? '+' : ''}
                  {comparison.runsChange} vs anterior
                </Text>
              }
            />
          </View>
          <Text className="text-xs text-ink-400">
            Tempo em movimento: {formatDuration(comparison.current.movingTimeS)}
          </Text>
          {(() => {
            const message = describeProgress(comparison);
            return (
              <Text
                accessibilityLiveRegion="polite"
                className={`text-base font-semibold ${toneText[message.tone]}`}
              >
                {message.text}
              </Text>
            );
          })()}
        </>
      )}
    </View>
  );
}
