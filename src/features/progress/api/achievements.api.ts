import { ACHIEVEMENT_IDS, type AchievementId } from '@/domain/insights/records';
import { supabase } from '@/services/supabase/client';

export type UnlockedAchievement = { id: AchievementId; unlockedAt: string };

function isAchievementId(value: string): value is AchievementId {
  return (ACHIEVEMENT_IDS as readonly string[]).includes(value);
}

export async function fetchUnlockedAchievements(userId: string): Promise<UnlockedAchievement[]> {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('achievement_id, unlocked_at')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? [])
    .filter((row) => isAchievementId(row.achievement_id))
    .map((row) => ({ id: row.achievement_id as AchievementId, unlockedAt: row.unlocked_at }));
}

/** Stores medals as unlocked; already-stored ones are left untouched. */
export async function unlockAchievements(
  userId: string,
  ids: readonly AchievementId[],
  runId: string | null = null,
): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('user_achievements').upsert(
    ids.map((id) => ({ user_id: userId, achievement_id: id, run_id: runId })),
    { onConflict: 'user_id,achievement_id', ignoreDuplicates: true },
  );
  if (error) throw error;
}
