import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { BodyRegion, BodySide } from '@/domain/health/body-regions';

import { fetchOpenPains, type PainLog, resolvePain, setPain } from '../api/pain.api';

export const painKeys = { open: (userId: string) => ['pains', userId] as const };

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
