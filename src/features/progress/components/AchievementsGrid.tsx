import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { computeAchievements } from '@/domain/insights/records';
import { useThemeColors } from '@/theme/theme';
import { colors } from '@/theme/tokens';

import { ACHIEVEMENT_COPY } from '../achievements-copy';
import { useRecords } from '../hooks/useRecords';

type AchievementsGridProps = {
  userId: string;
  /** All-time totals (profile stats); undefined while loading. */
  totals: { runs: number; distanceM: number } | undefined;
};

/** Badge grid: unlocked medals glow in amber, locked ones show progress. */
export function AchievementsGrid({ userId, totals }: AchievementsGridProps) {
  const theme = useThemeColors();
  const { data } = useRecords(userId);

  const achievements = useMemo(
    () =>
      data && totals
        ? computeAchievements({
            totalRuns: totals.runs,
            totalDistanceM: totals.distanceM,
            longestRunM: data.efforts.longestRunM,
            longestWeekStreak: data.longestWeekStreak,
          })
        : null,
    [data, totals],
  );

  if (!achievements) {
    return (
      <View className="flex-row flex-wrap gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} className="w-[31%]">
            <Skeleton height={128} radius={20} />
          </View>
        ))}
      </View>
    );
  }

  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <View className="gap-3">
      <Text className="px-1 text-sm text-ink-400">
        <Text className="font-extrabold text-accent">{unlocked}</Text> de {achievements.length}{' '}
        conquistas desbloqueadas
      </Text>
      <View className="flex-row flex-wrap justify-between gap-y-3">
        {achievements.map((a) => {
          const copy = ACHIEVEMENT_COPY[a.id];
          return (
            <View
              key={a.id}
              accessible
              accessibilityLabel={`${copy.title}. ${
                a.unlocked ? 'Desbloqueada' : `${Math.round(a.progress * 100)}% concluída`
              }. ${copy.description}`}
              className={`w-[31%] items-center gap-2 rounded-[20px] border px-2 py-4 ${
                a.unlocked ? 'border-bolt-500/40 bg-bolt-500/10' : 'border-hairline bg-ink-800'
              }`}
            >
              <View
                className={`h-14 w-14 items-center justify-center rounded-full ${
                  a.unlocked ? 'bg-bolt-500' : 'border border-dashed border-ink-600 bg-ink-900'
                }`}
              >
                <Ionicons
                  name={a.unlocked ? copy.icon : 'lock-closed'}
                  size={a.unlocked ? 26 : 18}
                  color={a.unlocked ? colors.onBolt : theme.ink[500]}
                />
              </View>
              <Text
                className={`text-center text-xs font-bold leading-4 ${
                  a.unlocked ? 'text-ink-50' : 'text-ink-300'
                }`}
                numberOfLines={2}
              >
                {copy.title}
              </Text>
              {a.unlocked ? null : (
                <View className="h-1 w-full overflow-hidden rounded-full bg-ink-700">
                  <View
                    className="h-1 rounded-full bg-ink-400"
                    style={{ width: `${Math.round(a.progress * 100)}%` }}
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
