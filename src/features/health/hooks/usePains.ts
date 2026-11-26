import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { BodyRegion, BodySide } from '@/domain/health/body-regions';

import {
  fetchOpenPains,
  fetchPainHistory,
  type PainLog,
  resolvePain,
  setPain,
} from '../api/pain.api';

/** Both keys share the ['pains', userId] prefix: any pain change refreshes the history too. */
export const painKeys = {
  open: (userId: string) => ['pains', userId] as const,
  history: (userId: string) => ['pains', userId, 'history'] as const,
};

export function usePainHistory(userId: string) {
  return useQuery({ queryKey: painKeys.history(userId), queryFn: () => fetchPainHistory(userId) });
}

export function useOpenPains(userId: string) {
  return useQuery({ queryKey: painKeys.open(userId), queryFn: () => fetchOpenPains(userId) });
}

export function useSetPain(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      existing,
      region,
      side,
      intensity,
    }: {
      existing: PainLog | undefined;
      region: BodyRegion;
      side: BodySide;
      intensity: number;
    }) => setPain(userId, existing, region, side, intensity),
    onSettled: () => queryClient.invalidateQueries({ queryKey: painKeys.open(userId) }),
  });
}

export function useResolvePain(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resolvePain(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: painKeys.open(userId) }),
  });
}
