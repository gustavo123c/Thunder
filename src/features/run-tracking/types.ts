import type { RawLocation } from '@/domain/geo/location-sample';
import type { RunSession } from '@/domain/run-session/run-session';
import type { GpsSample, RunSummary } from '@/domain/types/run';

/** A run kept on the device: in progress, or finished and waiting for upload. */
export type StoredRun = {
  session: RunSession;
  userId: string;
  /** Set when the run is finished. */
  summary: RunSummary | null;
  title: string | null;
  createdAt: number;
};

/** Durable local storage for runs (SQLite in the app, in-memory in tests). */
export interface RunRepository {
  /** The run currently being recorded (running or paused), if any. */
  getActiveRun(): Promise<StoredRun | null>;
  /** Finished runs that were not uploaded yet, oldest first. */
  listPendingRuns(userId: string): Promise<StoredRun[]>;
  getRun(runId: string): Promise<StoredRun | null>;
  saveRun(run: StoredRun): Promise<void>;
  appendSamples(runId: string, samples: readonly GpsSample[]): Promise<void>;
  getSamples(runId: string): Promise<GpsSample[]>;
  getLastSample(runId: string): Promise<GpsSample | null>;
  deleteRun(runId: string): Promise<void>;
}

export type LocationPermission = 'granted' | 'foreground_only' | 'denied';

/** Platform location updates (expo-location in the app, fake in tests). */
export interface LocationTracker {
  getPermission(): Promise<LocationPermission>;
  requestPermission(): Promise<LocationPermission>;
  start(): Promise<void>;
  stop(): Promise<void>;
  isStarted(): Promise<boolean>;
}

export type { RawLocation };
