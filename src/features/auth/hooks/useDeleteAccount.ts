import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteAccount } from '../api/delete-account.api';

export function useDeleteAccount(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteAccount(userId),
    onSuccess: () => queryClient.clear(),
  });
}
