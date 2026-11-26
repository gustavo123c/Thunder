import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  generateWorkout,
  type WorkoutPlan,
  type WorkoutRequest,
} from '@/domain/training/workout-generator';

import { deleteWorkout, fetchRecentWorkouts, saveWorkout } from '../api/workouts.api';

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
    mutationFn: async (request: WorkoutRequest): Promise<WorkoutPlan> => {
      const plan = generateWorkout(request);
      saveWorkout(userId, request, plan)
        .then(() => queryClient.invalidateQueries({ queryKey: workoutKeys.recent(userId) }))
        .catch((error: unknown) => console.warn('[workouts] save failed', error));
      return plan;
    },
  });
}

export function useDeleteWorkout(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWorkout,
    onSettled: () => queryClient.invalidateQueries({ queryKey: workoutKeys.recent(userId) }),
  });
}
