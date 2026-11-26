import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { computeWinStreak } from '@/domain/insights/activity';
import { useThemeColors } from '@/theme/theme';
import { colors } from '@/theme/tokens';

import { useActivity } from '../hooks/useActivity';
import { describeStreakCounts, describeWeekStreak } from '../progress-copy';

/** Gamified frequency card: runs this week/month + consecutive active weeks. */
export function WinStreakCard({ userId }: { userId: string }) {
  const theme = useThemeColors();
  const activity = useActivity(userId);
  const streak = useMemo(
    () => (activity.data ? computeWinStreak(activity.data, new Date()) : null),
    [activity.data],
  );

  if (!streak) {
    return activity.isError ? null : <Skeleton height={112} radius={20} />;
  }

  const onFire = streak.weekStreak >= 2;
  const icon = onFire ? 'flame' : streak.runsThisWeek > 0 ? 'flash' : 'flag-outline';

  return (
    <Card variant="highlight">
      <View
        accessible
        accessibilityLabel={`${describeStreakCounts(streak)}. ${describeWeekStreak(streak)}`}
        className="flex-row items-center gap-4"
      >
        <View
          className={`h-16 w-16 items-center justify-center rounded-full ${
            onFire ? 'bg-bolt-500' : 'border border-bolt-500/40 bg-bolt-500/10'
          }`}
        >
          <Ionicons name={icon} size={28} color={onFire ? colors.onBolt : theme.accent} />
        </View>
        <View className="flex-1 gap-1">
          <View className="flex-row items-baseline gap-2">
            <Text
              className="text-[36px] font-extrabold leading-[40px] text-ink-50"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {streak.weekStreak}
            </Text>
            <Text className="text-xs font-bold uppercase tracking-[1.5px] text-accent">
              {streak.weekStreak === 1 ? 'semana ativa' : 'semanas seguidas'}
            </Text>
          </View>
          <Text className="text-sm font-semibold text-ink-100">{describeStreakCounts(streak)}</Text>
          <Text className="text-xs text-ink-400">{describeWeekStreak(streak)}</Text>
        </View>
      </View>
    </Card>
  );
}
