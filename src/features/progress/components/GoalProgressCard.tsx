import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { recentAveragePace } from '@/domain/insights/activity';
import { type GoalProgress, goalProgress } from '@/domain/insights/records';
import type { RunnerGoal } from '@/domain/types/profile';
import { formatDistanceKm, formatDuration, formatPace } from '@/lib/format';
import { useThemeColors } from '@/theme/theme';

import { useActivity } from '../hooks/useActivity';
import { useRecords } from '../hooks/useRecords';

function describe(progress: GoalProgress): string {
  switch (progress.unit) {
    case 'm':
      return `Maior corrida: ${formatDistanceKm(progress.current ?? 0)} de ${formatDistanceKm(progress.target)}`;
    case 's':
      return `Maior tempo correndo: ${formatDuration(progress.current ?? 0)} de ${formatDuration(progress.target)}`;
    case 's_per_km':
      return progress.current
        ? `Pace recente ${formatPace(progress.current)} · alvo ${formatPace(progress.target)}`
        : `Corra para medir seu pace · alvo ${formatPace(progress.target)}`;
    case 'runs':
      return `${progress.current ?? 0} de ${progress.target} corridas neste mês`;
  }
}

type GoalProgressCardProps = {
  userId: string;
  goal: RunnerGoal;
  goalTitle: string;
  goalDescription: string;
  targetPaceSPerKm: number | null;
};

/** Main goal with a visual progress bar measured from recent activity. */
export function GoalProgressCard({
  userId,
  goal,
  goalTitle,
  goalDescription,
  targetPaceSPerKm,
}: GoalProgressCardProps) {
  const theme = useThemeColors();
  const activity = useActivity(userId);
  const { data } = useRecords(userId);

  const progress = useMemo(() => {
    if (!data || !activity.data) return null;
    return goalProgress(goal, {
      ...data.efforts,
      recentPaceSPerKm: recentAveragePace(activity.data),
      targetPaceSPerKm,
      runsThisMonth: data.streak.runsThisMonth,
    });
  }, [activity.data, data, goal, targetPaceSPerKm]);

  const percent = progress ? Math.round(progress.progress * 100) : null;

  return (
    <Card variant="highlight" className="gap-3">
      <View className="flex-row items-center gap-2">
        <Ionicons name="flag" size={14} color={theme.accent} />
        <Text className="flex-1 text-[11px] font-medium uppercase tracking-[1.5px] text-accent">
          Meta principal
        </Text>
        {percent !== null ? (
          <Text
            className="text-[32px] font-extrabold leading-[36px] text-ink-50"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {percent}%
          </Text>
        ) : null}
      </View>
      <Text className="text-xl font-bold text-ink-50">{goalTitle}</Text>
      {progress ? (
        <>
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`Progresso da meta: ${percent}%`}
            accessibilityValue={{ min: 0, max: 100, now: percent ?? 0 }}
            className="h-2.5 overflow-hidden rounded-full bg-ink-900"
          >
            <View
              className="h-2.5 rounded-full bg-bolt-500"
              style={{ width: `${Math.max(percent ?? 0, 2)}%` }}
            />
          </View>
          <Text className="text-sm text-ink-300">{describe(progress)}</Text>
        </>
      ) : (
        <Text className="text-sm text-ink-300">{goalDescription}</Text>
      )}
    </Card>
  );
}
