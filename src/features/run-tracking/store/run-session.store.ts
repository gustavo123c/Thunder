import { create } from 'zustand';

import type { RecorderSnapshot } from '../services/run-recorder';

type RunSessionState = RecorderSnapshot & {
  /** True once the recorder restored any interrupted run from local storage. */
  ready: boolean;
  setSnapshot: (snapshot: RecorderSnapshot) => void;
  setReady: () => void;
};

/** UI mirror of the recorder. The recorder is the source of truth; this only re-renders. */
export const useRunSessionStore = create<RunSessionState>((set) => ({
  run: null,
  samples: [],
  ready: false,
  setSnapshot: (snapshot) => set({ run: snapshot.run, samples: snapshot.samples }),
  setReady: () => set({ ready: true }),
}));
