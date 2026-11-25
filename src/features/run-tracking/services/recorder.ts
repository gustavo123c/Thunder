import { randomUUID } from 'expo-crypto';
import type { LocationObject } from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { isExpoGo } from '@/lib/runtime';

import type { LocationTracker } from '../types';
import { expoLocationTracker, LOCATION_TASK_NAME } from './expo-location-tracker';
import { createForegroundLocationTracker } from './foreground-location-tracker';
import { RunRecorder } from './run-recorder';
import { createSqliteRunRepository } from './sqlite-run.repository';

export const runRepository = createSqliteRunRepository();

/**
 * Background GPS in development/production builds; foreground-only in Expo Go
 * (no background location there on iOS).
 */
export const locationTracker: LocationTracker = isExpoGo
  ? createForegroundLocationTracker((locations) => void runRecorder.ingest(locations))
  : expoLocationTracker;

/** App-wide recorder instance (one per JS runtime). */
export const runRecorder = new RunRecorder({
  repository: runRepository,
  tracker: locationTracker,
  now: () => Date.now(),
  createId: randomUUID,
});

type LocationTaskData = { locations: LocationObject[] };

/**
 * Must run at module load (global scope), before the app renders: the OS may launch
 * the JS runtime headlessly just to deliver locations to this task.
 */
TaskManager.defineTask<LocationTaskData>(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.warn('[location-task]', error.message);
    return;
  }
  if (data?.locations?.length) {
    await runRecorder.ingest(data.locations);
  }
});
