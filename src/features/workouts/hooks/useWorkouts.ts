import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  generateWorkout,
  type WorkoutPlan,
  type WorkoutRequest,
} from '@/domain/training/workout-generator';

import { useActiveWorkoutStore } from '../active-workout.store';
import {
  deleteAllWorkouts,
  deleteWorkout,
  fetchRecentWorkouts,
  newWorkoutId,
  saveWorkout,
  saveWorkoutFeedback,
  type WorkoutFeedback,
} from '../api/workouts.api';

const workoutKeys = { recent: (userId: string) => ['workouts', userId] as const };

export function useRecentWorkouts(userId: string) {
  return useQuery({
    queryKey: workoutKeys.recent(userId),
    queryFn: () => fetchRecentWorkouts(userId),
  });
}

/**
 * Generates the plan locally (instant, offline) and saves it in the background.
 * A failed save doesn't hide the plan — it only won't appear in "recent".
 */
export function useGenerateWorkout(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: WorkoutRequest): Promise<{ id: string; plan: WorkoutPlan }> => {
      const plan = generateWorkout(request);
      const id = newWorkoutId();
      saveWorkout(userId, request, plan, id)
        .then(() => queryClient.invalidateQueries({ queryKey: workoutKeys.recent(userId) }))
        .catch((error: unknown) => console.warn('[workouts] save failed', error));
      return { id, plan };
    },
  });
}

export function useDeleteWorkout(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWorkout,
    onSuccess: (_, id) => {
      // A deleted workout can't be the one the next run checks in against.
      const { active, clear } = useActiveWorkoutStore.getState();
      if (active?.id === id) clear();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: workoutKeys.recent(userId) }),
  });
}

export function useDeleteAllWorkouts(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteAllWorkouts(userId),
    onSuccess: () => useActiveWorkoutStore.getState().clear(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: workoutKeys.recent(userId) }),
  });
}

export function useWorkoutFeedback(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workoutId,
      feedback,
      runId,
    }: {
      workoutId: string;
      feedback: WorkoutFeedback;
      runId: string | null;
    }) => saveWorkoutFeedback(workoutId, feedback, runId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: workoutKeys.recent(userId) }),
  });
}
