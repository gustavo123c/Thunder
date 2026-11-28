import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { acceptTerms, type AcceptTermsInput, fetchTermsAcceptance } from '../api/terms.api';
import { TERMS_VERSION } from '../terms-content';

const termsKey = (userId: string | undefined) => ['terms', userId, TERMS_VERSION] as const;

export function useTermsAcceptance(userId: string | undefined) {
  return useQuery({
    queryKey: termsKey(userId),
    queryFn: () => fetchTermsAcceptance(userId as string),
    enabled: userId !== undefined,
  });
}

export function useAcceptTerms(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AcceptTermsInput) => acceptTerms(userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: termsKey(userId) }),
  });
}
