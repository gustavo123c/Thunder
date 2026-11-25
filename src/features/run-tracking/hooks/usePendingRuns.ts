import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { syncPendingRuns } from '../api/run-upload.api';
import { supabaseRunUploader } from '../api/supabase-run-uploader';
import { runRepository } from '../services/recorder';
import { RUNS_QUERY_KEY } from './useRunTracking';

const pendingKey = (userId: string) => [...RUNS_QUERY_KEY, 'pending', userId] as const;

/** Finished runs still waiting on the device for upload. */
export function usePendingRuns(userId: string) {
  return useQuery({
    queryKey: pendingKey(userId),
    queryFn: () => runRepository.listPendingRuns(userId),
    networkMode: 'always', // local data: no network needed
  });
}

export function useRetryPendingRuns(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      syncPendingRuns(userId, { repository: runRepository, uploader: supabaseRunUploader }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: RUNS_QUERY_KEY }),
  });
}
