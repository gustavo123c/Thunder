import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { computeWinStreak } from '@/domain/insights/activity';

import { useActivity } from '../hooks/useActivity';
import { describeStreakCounts, describeWeekStreak } from '../progress-copy';

/** Gamified frequency card: runs this week/month + consecutive active weeks. */
export function WinStreakCard({ userId }: { userId: string }) {
  const activity = useActivity(userId);
  const streak = useMemo(
    () => (activity.data ? computeWinStreak(activity.data, new Date()) : null),
    [activity.data],
  );

  if (!streak) {
    return activity.isError ? null : <Skeleton height={96} radius={24} />;
  }

  const onFire = streak.weekStreak >= 2;

  return (
    <View
      accessible
      accessibilityLabel={`${describeStreakCounts(streak)}. ${describeWeekStreak(streak)}`}
      className="flex-row items-center gap-4 rounded-3xl bg-ink-900 p-5 dark:bg-ink-800"
    >
      <View className="h-16 w-16 items-center justify-center rounded-full bg-bolt-500">
        <Text className="text-3xl">{onFire ? '🔥' : streak.runsThisWeek > 0 ? '⚡' : '🏁'}</Text>
      </View>
      <View className="flex-1 gap-1">
        <View className="flex-row items-baseline gap-2">
          <Text
            className="text-3xl font-black text-ink-50"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {streak.weekStreak}
          </Text>
          <Text className="text-sm font-semibold text-bolt-400">
            {streak.weekStreak === 1 ? 'semana ativa' : 'semanas seguidas'}
          </Text>
        </View>
        <Text className="text-sm text-ink-200">{describeStreakCounts(streak)}</Text>
        <Text className="text-xs text-ink-400">{describeWeekStreak(streak)}</Text>
      </View>
    </View>
  );
}
