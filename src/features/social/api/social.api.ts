import { supabase } from '@/services/supabase/client';
import {
  type FeedItem,
  parseComments,
  parseFeed,
  parseProfileSearch,
  parseProfileStats,
  type ProfileSearchResult,
  type ProfileStats,
  type RunComment,
} from '@/services/supabase/social-json';

export const FEED_PAGE_SIZE = 20;
export const MAX_COMMENT_LENGTH = 500; // mirrors the comments.body CHECK

/** Postgres unique_violation: e.g. a kudo that already exists. */
const UNIQUE_VIOLATION = '23505';

export type FeedCursor = { before: string; beforeId: string } | null;

export async function fetchFeed(cursor: FeedCursor): Promise<FeedItem[]> {
  const { data, error } = await supabase.rpc('get_feed', {
    p_limit: FEED_PAGE_SIZE,
    ...(cursor ? { p_before: cursor.before, p_before_id: cursor.beforeId } : {}),
  });
  if (error) throw error;
  return parseFeed(data);
}

export function nextFeedCursor(page: readonly FeedItem[]): FeedCursor {
  const last = page[page.length - 1];
  if (!last || page.length < FEED_PAGE_SIZE) return null;
  return { before: last.startedAt, beforeId: last.id };
}

export async function giveKudo(runId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('kudos').insert({ run_id: runId, user_id: userId });
  // Already given (double tap / another device): the desired state is reached.
  if (error && error.code !== UNIQUE_VIOLATION) throw error;
}

export async function removeKudo(runId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('kudos').delete().eq('run_id', runId).eq('user_id', userId);
  if (error) throw error;
}

export async function fetchComments(runId: string): Promise<RunComment[]> {
  const { data, error } = await supabase.rpc('list_comments', { p_run_id: runId });
  if (error) throw error;
  return parseComments(data);
}

export async function addComment(runId: string, userId: string, body: string): Promise<void> {
  const { error } = await supabase
    .from('comments')
    .insert({ run_id: runId, user_id: userId, body: body.trim() });
  if (error) throw error;
}

/** Soft delete: keeps the row for moderation, hides it everywhere. */
export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commentId);
  if (error) throw error;
}

export async function searchProfiles(query: string): Promise<ProfileSearchResult[]> {
  const { data, error } = await supabase.rpc('search_profiles', { p_query: query });
  if (error) throw error;
  return parseProfileSearch(data);
}

export async function fetchProfileStats(userId: string): Promise<ProfileStats> {
  const { data, error } = await supabase.rpc('get_profile_stats', { p_user_id: userId });
  if (error) throw error;
  return parseProfileStats(data);
}

export async function follow(followerId: string, followingId: string): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, following_id: followingId });
  if (error && error.code !== UNIQUE_VIOLATION) throw error;
}

export async function unfollow(followerId: string, followingId: string): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);
  if (error) throw error;
}
