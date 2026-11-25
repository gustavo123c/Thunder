import { randomUUID } from 'expo-crypto';
import type { LocationObject } from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { expoLocationTracker, LOCATION_TASK_NAME } from './expo-location-tracker';
import { RunRecorder } from './run-recorder';
import { createSqliteRunRepository } from './sqlite-run.repository';

export const runRepository = createSqliteRunRepository();

/** App-wide recorder instance (one per JS runtime). */
export const runRecorder = new RunRecorder({
  repository: runRepository,
  tracker: expoLocationTracker,
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
