import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AnamneseDraft } from '@/domain/health/anamnese';

import { deleteAnamnese, fetchAnamnese, upsertAnamnese } from '../api/anamnese.api';

const anamneseKey = (userId: string) => ['anamnese', userId] as const;

export function useAnamnese(userId: string) {
  return useQuery({
    queryKey: anamneseKey(userId),
    queryFn: () => fetchAnamnese(userId),
  });
}

export function useSaveAnamnese(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (draft: AnamneseDraft) => upsertAnamnese(userId, draft),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: anamneseKey(userId) }),
  });
}

export function useDeleteAnamnese(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteAnamnese(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: anamneseKey(userId) }),
  });
}
