import { supabase } from '@/services/supabase/client';
import {
  type LeaderboardRow,
  parseGroups,
  parseLeaderboard,
  type RunGroup,
} from '@/services/supabase/groups-json';
import { type FeedItem, parseFeed } from '@/services/supabase/social-json';

import { FEED_PAGE_SIZE, type FeedCursor } from './social.api';

export type { LeaderboardRow, RunGroup };

export const GROUP_NAME_MIN = 3;
export const GROUP_NAME_MAX = 40;

export type GroupErrorCode = 'not_found' | 'full' | 'invalid_name' | 'unknown';

/** Maps Postgres errors raised by create_group / join_group to UI codes. */
export function groupErrorCode(error: unknown): GroupErrorCode {
  const code = (error as { code?: string } | null)?.code;
  if (code === 'P0002') return 'not_found';
  if (code === '54000') return 'full';
  if (code === '23514') return 'invalid_name';
  return 'unknown';
}

export async function fetchMyGroups(): Promise<RunGroup[]> {
  const { data, error } = await supabase.rpc('list_my_groups');
  if (error) throw error;
  return parseGroups(data);
}

export async function createGroup(name: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_group', { p_name: name.trim() });
  if (error) throw error;
  return data;
}

/** Invite codes are 8 letters/digits; spaces and case don't matter. */
export function normalizeInviteCode(input: string): string {
  return input.replace(/[^a-z0-9]/gi, '').toUpperCase();
}

export async function joinGroup(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_group', { p_code: normalizeInviteCode(code) });
  if (error) throw error;
  return data;
}

export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase.from('groups').delete().eq('id', groupId);
  if (error) throw error;
}

export async function fetchLeaderboard(groupId: string, since: Date): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase.rpc('group_leaderboard', {
    p_group_id: groupId,
    p_since: since.toISOString(),
  });
  if (error) throw error;
  return parseLeaderboard(data);
}

export async function fetchGroupFeed(groupId: string, cursor: FeedCursor): Promise<FeedItem[]> {
  const { data, error } = await supabase.rpc('get_group_feed', {
    p_group_id: groupId,
    p_limit: FEED_PAGE_SIZE,
    ...(cursor ? { p_before: cursor.before, p_before_id: cursor.beforeId } : {}),
  });
  if (error) throw error;
  return parseFeed(data);
}
