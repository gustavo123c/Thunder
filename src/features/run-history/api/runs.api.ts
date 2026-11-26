import type { RunRecord } from '@/domain/types/run';
import { supabase } from '@/services/supabase/client';
import { parseRunDetail, parseRunList, type RunDetail } from '@/services/supabase/run-json';

export const RUNS_PAGE_SIZE = 20;

export type RunsCursor = { before: string; beforeId: string } | null;

export async function fetchUserRuns(userId: string, cursor: RunsCursor): Promise<RunRecord[]> {
  const { data, error } = await supabase.rpc('list_user_runs', {
    p_user_id: userId,
    p_limit: RUNS_PAGE_SIZE,
    ...(cursor ? { p_before: cursor.before, p_before_id: cursor.beforeId } : {}),
  });
  if (error) throw error;
  return parseRunList(data);
}

export class RunNotFoundError extends Error {
  constructor() {
    super('run_not_found');
    this.name = 'RunNotFoundError';
  }
}

export async function fetchRunDetail(runId: string): Promise<RunDetail> {
  const { data, error } = await supabase.rpc('get_run_detail', { p_run_id: runId });
  if (error) throw error;
  if (data === null) throw new RunNotFoundError(); // deleted or not visible
  return parseRunDetail(data);
}

export async function updateRun(
  runId: string,
  update: { title?: string; visibility?: RunRecord['visibility'] },
): Promise<void> {
  const { error } = await supabase.from('runs').update(update).eq('id', runId);
  if (error) throw error;
}

export const WORKOUT_MEDIA_BUCKET = 'workout-media';

/**
 * Deletes a run and its photos/videos. The database row goes first (it is what the
 * user sees); media rows cascade, and the files are then removed from Storage.
 * A failed file cleanup leaves only unreachable files behind (their run is gone).
 */
export async function deleteRun(runId: string): Promise<void> {
  const { data: media, error: mediaError } = await supabase
    .from('run_media')
    .select('storage_path')
    .eq('run_id', runId);
  if (mediaError) throw mediaError;

  const { error } = await supabase.from('runs').delete().eq('id', runId);
  if (error) throw error;

  const paths = (media ?? []).map((m) => m.storage_path);
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from(WORKOUT_MEDIA_BUCKET).remove(paths);
    if (storageError) console.warn('[runs] media cleanup failed', storageError);
  }
}

/** Next-page cursor from the last item of a page; null when the page was not full. */
export function nextCursor(page: readonly RunRecord[]): RunsCursor {
  const last = page[page.length - 1];
  if (!last || page.length < RUNS_PAGE_SIZE) return null;
  return { before: last.startedAt, beforeId: last.id };
}
