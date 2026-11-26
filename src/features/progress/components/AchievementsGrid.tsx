import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { achievementInput, computeAchievements } from '@/domain/insights/records';
import { useThemeColors } from '@/theme/theme';
import { colors } from '@/theme/tokens';

import { ACHIEVEMENT_COPY } from '../achievements-copy';
import { useUnlockAchievements, useUnlockedAchievements } from '../hooks/useAchievements';
import { useActivity } from '../hooks/useActivity';

type AchievementsGridProps = {
  userId: string;
  /** All-time totals (profile stats); undefined while loading. */
  totals: { runs: number; distanceM: number } | undefined;
};

/**
 * Medal grid: unlocked medals in amber, locked ones in grayscale with a progress bar.
 * Medals earned but not stored yet (e.g. runs recorded before medals existed) are saved.
 */
export function AchievementsGrid({ userId, totals }: AchievementsGridProps) {
  const theme = useThemeColors();
  const activity = useActivity(userId);
  const stored = useUnlockedAchievements(userId);
  const unlock = useUnlockAchievements(userId);

  const achievements = useMemo(() => {
    if (!activity.data || !totals) return null;
    const storedIds = new Set((stored.data ?? []).map((a) => a.id));
    return computeAchievements(achievementInput(activity.data, totals)).map((a) =>
      storedIds.has(a.id) ? { ...a, unlocked: true, progress: 1 } : a,
    );
  }, [activity.data, stored.data, totals]);

  // Automatic unlock: persist medals computed as earned but missing in the database.
  const missing = useMemo(() => {
    if (!achievements || !stored.isSuccess) return [];
    const storedIds = new Set(stored.data.map((a) => a.id));
    return achievements.filter((a) => a.unlocked && !storedIds.has(a.id)).map((a) => a.id);
  }, [achievements, stored.data, stored.isSuccess]);
  const { mutate, isPending, isError } = unlock;
  useEffect(() => {
    if (missing.length > 0 && !isPending && !isError) mutate({ ids: missing });
  }, [missing, isPending, isError, mutate]);

  if (!achievements) {
    return (
      <View className="flex-row flex-wrap justify-between gap-y-3">
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} className="w-[31%]">
            <Skeleton height={136} radius={20} />
          </View>
        ))}
      </View>
    );
  }

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const ordered = [
    ...achievements.filter((a) => a.unlocked),
    ...achievements.filter((a) => !a.unlocked),
  ];

  return (
    <View className="gap-3">
      <Text className="px-1 text-sm text-ink-400">
        <Text className="font-extrabold text-accent">{unlockedCount}</Text> de {achievements.length}{' '}
        medalhas conquistadas
      </Text>
      <View className="flex-row flex-wrap justify-between gap-y-3">
        {ordered.map((a) => {
          const copy = ACHIEVEMENT_COPY[a.id];
          const percent = Math.round(a.progress * 100);
          return (
            <View
              key={a.id}
              accessible
              accessibilityLabel={`${copy.title}. ${
                a.unlocked ? 'Conquistada' : `Bloqueada, ${percent}% concluída`
              }. ${copy.description}`}
              className={`w-[31%] items-center gap-2 rounded-[20px] border px-2 py-4 ${
                a.unlocked ? 'border-hairline bg-bolt-500/10' : 'border-hairline bg-ink-800'
              }`}
            >
              <View>
                <View
                  className={`h-14 w-14 items-center justify-center rounded-full ${
                    a.unlocked ? 'bg-bolt-500' : 'bg-ink-700'
                  }`}
                  style={a.unlocked ? undefined : { opacity: 0.55 }}
                >
                  <Ionicons
                    name={copy.icon}
                    size={26}
                    color={a.unlocked ? colors.onBolt : theme.ink[400]}
                  />
                </View>
                {a.unlocked ? null : (
                  <View className="absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full border border-hairline bg-ink-800">
                    <Ionicons name="lock-closed" size={10} color={theme.ink[400]} />
                  </View>
                )}
              </View>
              <Text
                className={`text-center text-xs font-bold leading-4 ${
                  a.unlocked ? 'text-ink-50' : 'text-ink-400'
                }`}
                numberOfLines={2}
              >
                {copy.title}
              </Text>
              {a.unlocked ? (
                <Text className="font-mono-medium text-[10px] uppercase tracking-wider text-accent">
                  Conquistada
                </Text>
              ) : (
                <View className="w-full gap-1">
                  <View className="h-1 w-full overflow-hidden rounded-full bg-ink-700">
                    <View
                      className="h-1 rounded-full bg-ink-400"
                      style={{ width: `${percent}%` }}
                    />
                  </View>
                  <Text
                    className="text-center text-[10px] text-ink-500"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {percent}%
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
