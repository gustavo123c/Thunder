// Importing this module registers the background location task (global scope).
import './services/recorder';

export { RecordView } from './components/RecordView';
export { RUNS_QUERY_KEY, useRunTrackingBootstrap } from './hooks/useRunTracking';
export { runRepository } from './services/recorder';
export { useRunSessionStore } from './store/run-session.store';
export type { StoredRun } from './types';
