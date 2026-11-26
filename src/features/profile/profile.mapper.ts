import type { Profile, ProfileUpdate } from '@/domain/types/profile';
import type { Database } from '@/services/supabase/database.types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileRowUpdate = Database['public']['Tables']['profiles']['Update'];

/** Postgres numeric may arrive as string depending on the driver; normalize. */
function toNumber(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function profileFromRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    level: row.level,
    weightKg: toNumber(row.weight_kg),
    heightCm: toNumber(row.height_cm),
    birthDate: row.birth_date,
    mainGoal: row.main_goal,
    goalTargetPaceSPerKm: toNumber(row.goal_target_pace_s_per_km),
    onboardedAt: row.onboarded_at,
    sex: row.sex ?? null,
  };
}

const COLUMN_BY_FIELD = {
  username: 'username',
  fullName: 'full_name',
  level: 'level',
  weightKg: 'weight_kg',
  heightCm: 'height_cm',
  birthDate: 'birth_date',
  mainGoal: 'main_goal',
  goalTargetPaceSPerKm: 'goal_target_pace_s_per_km',
  sex: 'sex',
} as const satisfies Record<keyof ProfileUpdate, keyof ProfileRowUpdate>;

/** Only fields present in `update` are sent, so partial edits never null other columns. */
export function profileUpdateToRow(update: ProfileUpdate): ProfileRowUpdate {
  const row: Record<string, unknown> = {};
  for (const field of Object.keys(update) as (keyof ProfileUpdate)[]) {
    if (update[field] !== undefined) row[COLUMN_BY_FIELD[field]] = update[field];
  }
  return row as ProfileRowUpdate;
}
