import type { GpsSample } from '@/domain/types/run';

import type { RunRepository, StoredRun } from '../types';

/** In-memory RunRepository: used by tests and as a reference for the SQLite one. */
export function createMemoryRunRepository(): RunRepository {
  const runs = new Map<string, StoredRun>();
  const samples = new Map<string, GpsSample[]>();

  return {
    async getActiveRun() {
      for (const run of runs.values()) {
        if (run.session.status !== 'finished') return run;
      }
      return null;
    },
    async listPendingRuns(userId) {
      return [...runs.values()]
        .filter((run) => run.userId === userId && run.session.status === 'finished')
        .sort((a, b) => a.createdAt - b.createdAt);
    },
    async getRun(runId) {
      return runs.get(runId) ?? null;
    },
    async saveRun(run) {
      runs.set(run.session.id, structuredClone(run));
    },
    async appendSamples(runId, newSamples) {
      samples.set(runId, [...(samples.get(runId) ?? []), ...newSamples]);
    },
    async getSamples(runId) {
      return [...(samples.get(runId) ?? [])];
    },
    async getLastSample(runId) {
      const list = samples.get(runId) ?? [];
      return list[list.length - 1] ?? null;
    },
    async deleteRun(runId) {
      runs.delete(runId);
      samples.delete(runId);
    },
  };
}
