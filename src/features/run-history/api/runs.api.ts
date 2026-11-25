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

export async function deleteRun(runId: string): Promise<void> {
  const { error } = await supabase.from('runs').delete().eq('id', runId);
  if (error) throw error;
}

/** Next-page cursor from the last item of a page; null when the page was not full. */
export function nextCursor(page: readonly RunRecord[]): RunsCursor {
  const last = page[page.length - 1];
  if (!last || page.length < RUNS_PAGE_SIZE) return null;
  return { before: last.startedAt, beforeId: last.id };
}
