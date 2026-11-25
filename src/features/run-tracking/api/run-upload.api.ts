import type { RunRepository, StoredRun } from '../types';
import { buildFinishRunPayload, type RunVisibility } from '../upload-payload';

/** Remote API used to upload runs (Supabase RPC in the app, fake in tests). */
export type RunUploader = (payload: ReturnType<typeof buildFinishRunPayload>) => Promise<string>;

/**
 * Uploads one finished local run and deletes it locally once the server confirms.
 * Safe to retry: the server deduplicates by client_id.
 */
export async function uploadStoredRun(
  run: StoredRun,
  {
    repository,
    uploader,
    visibility = 'followers',
  }: { repository: RunRepository; uploader: RunUploader; visibility?: RunVisibility },
): Promise<string> {
  if (run.session.status !== 'finished' || !run.summary) {
    throw new Error('Only finished runs can be uploaded');
  }
  const samples = await repository.getSamples(run.session.id);
  const remoteId = await uploader(
    buildFinishRunPayload({
      clientId: run.session.id,
      title: run.title ?? 'Corrida',
      visibility,
      summary: run.summary,
      samples,
    }),
  );
  await repository.deleteRun(run.session.id);
  return remoteId;
}

export type SyncResult = { uploaded: string[]; failed: number };

/** Uploads every pending run of the user, oldest first; keeps failures for the next try. */
export async function syncPendingRuns(
  userId: string,
  deps: { repository: RunRepository; uploader: RunUploader },
): Promise<SyncResult> {
  const pending = await deps.repository.listPendingRuns(userId);
  const result: SyncResult = { uploaded: [], failed: 0 };
  for (const run of pending) {
    try {
      result.uploaded.push(await uploadStoredRun(run, deps));
    } catch {
      result.failed += 1;
    }
  }
  return result;
}
