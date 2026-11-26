import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AchievementId } from '@/domain/insights/records';

import { fetchUnlockedAchievements, unlockAchievements } from '../api/achievements.api';

export const achievementsKey = (userId: string) => ['achievements', userId] as const;

export function useUnlockedAchievements(userId: string) {
  return useQuery({
    queryKey: achievementsKey(userId),
    queryFn: () => fetchUnlockedAchievements(userId),
  });
}

export function useUnlockAchievements(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, runId }: { ids: readonly AchievementId[]; runId?: string | null }) =>
      unlockAchievements(userId, ids, runId ?? null),
    onSettled: () => queryClient.invalidateQueries({ queryKey: achievementsKey(userId) }),
  });
}
