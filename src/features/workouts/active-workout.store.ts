import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** A generated workout the runner tapped "Iniciar este treino" on. */
export type ActiveWorkout = {
  id: string;
  title: string;
  /** Generated with pains on the body map → ask how it felt afterwards. */
  forPain: boolean;
  startedAt: number; // epoch ms
};

/** After this, a finished run no longer counts as "the" workout that was started. */
export const ACTIVE_WORKOUT_TTL_MS = 6 * 60 * 60 * 1000;

type ActiveWorkoutState = {
  active: ActiveWorkout | null;
  start: (workout: Omit<ActiveWorkout, 'startedAt'>) => void;
  clear: () => void;
};

/** Persisted so the post-workout check-in survives the app being closed mid-run. */
export const useActiveWorkoutStore = create<ActiveWorkoutState>()(
  persist(
    (set) => ({
      active: null,
      start: (workout) => set({ active: { ...workout, startedAt: Date.now() } }),
      clear: () => set({ active: null }),
    }),
    { name: 'thunder.active-workout', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** The active workout, if it was started recently enough to match a run that just ended. */
export function currentActiveWorkout(
  active: ActiveWorkout | null,
  now = Date.now(),
): ActiveWorkout | null {
  return active && now - active.startedAt <= ACTIVE_WORKOUT_TTL_MS ? active : null;
}
