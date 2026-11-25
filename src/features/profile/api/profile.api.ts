import type { Profile, ProfileUpdate } from '@/domain/types/profile';
import { supabase } from '@/services/supabase/client';

import { profileFromRow, profileUpdateToRow } from '../profile.mapper';

/** Postgres unique_violation — raised when the username is already taken. */
export const UNIQUE_VIOLATION = '23505';

export class UsernameTakenError extends Error {
  constructor() {
    super('username_taken');
    this.name = 'UsernameTakenError';
  }
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return profileFromRow(data);
}

export async function isUsernameTaken(username: string, ownUserId: string): Promise<boolean> {
  // `username` is citext, so eq() is case-insensitive.
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .neq('id', ownUserId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

type UpdateOptions = {
  /** Marks onboarding as done in the same write. */
  completeOnboarding?: boolean;
};

export async function updateProfile(
  userId: string,
  update: ProfileUpdate,
  { completeOnboarding = false }: UpdateOptions = {},
): Promise<Profile> {
  const row = profileUpdateToRow(update);
  if (completeOnboarding) row.onboarded_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('profiles')
    .update(row)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) throw new UsernameTakenError();
    throw error;
  }
  return profileFromRow(data);
}
