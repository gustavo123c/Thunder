import {
  applyGpsFilter,
  type GpsFilterState,
  INITIAL_GPS_FILTER_STATE,
} from '@/domain/geo/gps-filter';
import { type RawLocation, toGpsSample } from '@/domain/geo/location-sample';
import { summarizeRun } from '@/domain/metrics/run-summary';
import {
  currentSegment,
  finishRunSession,
  pauseRunSession,
  resumeRunSession,
  startRunSession,
} from '@/domain/run-session/run-session';
import type { GpsSample } from '@/domain/types/run';

import type { LocationTracker, RunRepository, StoredRun } from '../types';

export type RecorderSnapshot = {
  run: StoredRun | null;
  /** Accepted samples of the active run, in order. */
  samples: readonly GpsSample[];
};

type RecorderDeps = {
  repository: RunRepository;
  tracker: LocationTracker;
  now: () => number;
  createId: () => string;
};

type Listener = (snapshot: RecorderSnapshot) => void;

export class ActiveRunExistsError extends Error {
  constructor() {
    super('A run is already being recorded');
    this.name = 'ActiveRunExistsError';
  }
}

/**
 * Orchestrates a recording: session state machine + GPS filter + durable storage +
 * platform location updates. Every operation is serialized, so a location batch that
 * arrives while the user taps "pause" can never interleave with it.
 *
 * Works both in the UI runtime and in a headless background-task runtime: state is
 * lazily restored from the repository before any operation.
 */
export class RunRecorder {
  private run: StoredRun | null = null;
  private samples: GpsSample[] = [];
  private filter: GpsFilterState = INITIAL_GPS_FILTER_STATE;
  private restored = false;
  private queue: Promise<unknown> = Promise.resolve();
  private readonly listeners = new Set<Listener>();

  constructor(private readonly deps: RecorderDeps) {}

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  snapshot(): RecorderSnapshot {
    return { run: this.run, samples: this.samples };
  }

  /** Loads an interrupted run (app killed / reloaded) and makes sure GPS is still on. */
  restore(): Promise<RecorderSnapshot> {
    return this.serial(async () => {
      await this.ensureRestored();
      if (this.run?.session.status === 'running' && !(await this.deps.tracker.isStarted())) {
        await this.deps.tracker.start();
      }
      return this.snapshot();
    });
  }

  start(userId: string): Promise<StoredRun> {
    return this.serial(async () => {
      await this.ensureRestored();
      if (this.run) throw new ActiveRunExistsError();

      const now = this.deps.now();
      const run: StoredRun = {
        session: startRunSession(this.deps.createId(), now),
        userId,
        summary: null,
        title: null,
        createdAt: now,
      };
      await this.deps.repository.saveRun(run);
      this.setState(run, [], INITIAL_GPS_FILTER_STATE);

      try {
        await this.deps.tracker.start();
      } catch (error) {
        // Without GPS there is no run: roll back so the user can retry cleanly.
        await this.deps.repository.deleteRun(run.session.id);
        this.setState(null, [], INITIAL_GPS_FILTER_STATE);
        throw error;
      }
      return run;
    });
  }

  pause(): Promise<void> {
    return this.serial(async () => {
      const run = await this.requireRun();
      await this.deps.tracker.stop();
      await this.persistSession({ ...run, session: pauseRunSession(run.session, this.deps.now()) });
    });
  }

  resume(): Promise<void> {
    return this.serial(async () => {
      const run = await this.requireRun();
      await this.persistSession({
        ...run,
        session: resumeRunSession(run.session, this.deps.now()),
      });
      await this.deps.tracker.start();
    });
  }

  /** Closes the run, computes its summary and keeps it locally until uploaded. */
  finish({ weightKg, title }: { weightKg: number | null; title: string }): Promise<StoredRun> {
    return this.serial(async () => {
      const run = await this.requireRun();
      await this.deps.tracker.stop();

      const session = finishRunSession(run.session, this.deps.now());
      const summary = summarizeRun({ samples: this.samples, periods: session.periods, weightKg });
      const finished: StoredRun = { ...run, session, summary, title };

      await this.deps.repository.saveRun(finished);
      this.setState(null, [], INITIAL_GPS_FILTER_STATE);
      return finished;
    });
  }

  /** Throws away the active run (e.g. started by mistake). */
  discard(): Promise<void> {
    return this.serial(async () => {
      const run = await this.requireRun();
      await this.deps.tracker.stop();
      await this.deps.repository.deleteRun(run.session.id);
      this.setState(null, [], INITIAL_GPS_FILTER_STATE);
    });
  }

  /** Entry point for location batches from the platform (foreground or background). */
  ingest(locations: readonly RawLocation[]): Promise<number> {
    return this.serial(async () => {
      await this.ensureRestored();
      const run = this.run;
      if (!run || run.session.status !== 'running') return 0;

      const segment = currentSegment(run.session);
      const accepted: GpsSample[] = [];
      let filter = this.filter;

      const sorted = [...locations].sort((a, b) => a.timestamp - b.timestamp);
      for (const location of sorted) {
        const sample = toGpsSample(location, segment);
        const result = applyGpsFilter(filter, sample);
        filter = result.state;
        if (result.accepted) accepted.push(sample);
      }

      if (accepted.length > 0) {
        await this.deps.repository.appendSamples(run.session.id, accepted);
      }
      this.setState(
        run,
        accepted.length > 0 ? [...this.samples, ...accepted] : this.samples,
        filter,
      );
      return accepted.length;
    });
  }

  private async ensureRestored(): Promise<void> {
    if (this.restored) return;
    const run = await this.deps.repository.getActiveRun();
    if (run) {
      const samples = await this.deps.repository.getSamples(run.session.id);
      this.setState(run, samples, {
        lastAccepted: samples[samples.length - 1] ?? null,
        consecutiveJumpRejections: 0,
      });
    }
    this.restored = true;
  }

  private async requireRun(): Promise<StoredRun> {
    await this.ensureRestored();
    if (!this.run) throw new Error('No active run');
    return this.run;
  }

  private async persistSession(run: StoredRun): Promise<void> {
    await this.deps.repository.saveRun(run);
    this.setState(run, this.samples, this.filter);
  }

  private setState(run: StoredRun | null, samples: GpsSample[], filter: GpsFilterState): void {
    const changed = run !== this.run || samples !== this.samples;
    this.run = run;
    this.samples = samples;
    this.filter = filter;
    if (changed) {
      const snapshot = this.snapshot();
      this.listeners.forEach((listener) => listener(snapshot));
    }
  }

  private serial<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task, task);
    this.queue = result.catch(() => undefined);
    return result;
  }
}
