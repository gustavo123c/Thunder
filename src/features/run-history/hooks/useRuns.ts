import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { RunRecord } from '@/domain/types/run';

import {
  deleteRun,
  fetchRunDetail,
  fetchUserRuns,
  nextCursor,
  RunNotFoundError,
  type RunsCursor,
  updateRun,
} from '../api/runs.api';

/** All run queries start with ['runs'] so uploads/deletes can invalidate them together. */
export const runKeys = {
  all: ['runs'] as const,
  user: (userId: string) => ['runs', 'user', userId] as const,
  detail: (runId: string) => ['runs', 'detail', runId] as const,
};

export function useUserRuns(userId: string) {
  return useInfiniteQuery({
    queryKey: runKeys.user(userId),
    queryFn: ({ pageParam }) => fetchUserRuns(userId, pageParam),
    initialPageParam: null as RunsCursor,
    getNextPageParam: (lastPage) => nextCursor(lastPage),
  });
}

export function useRunDetail(runId: string) {
  return useQuery({
    queryKey: runKeys.detail(runId),
    queryFn: () => fetchRunDetail(runId),
    retry: (failureCount, error) => !(error instanceof RunNotFoundError) && failureCount < 2,
  });
}

export function useUpdateRun(runId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (update: { title?: string; visibility?: RunRecord['visibility'] }) =>
      updateRun(runId, update),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: runKeys.all }),
  });
}

export function useDeleteRun(runId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteRun(runId),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: runKeys.detail(runId) });
      await queryClient.invalidateQueries({ queryKey: runKeys.all });
    },
  });
}
