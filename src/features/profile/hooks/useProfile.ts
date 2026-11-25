import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Profile, ProfileUpdate } from '@/domain/types/profile';

import { fetchProfile, isUsernameTaken, updateProfile } from '../api/profile.api';

export const profileKeys = {
  detail: (userId: string) => ['profile', userId] as const,
};

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: profileKeys.detail(userId ?? 'anonymous'),
    queryFn: () => fetchProfile(userId as string),
    enabled: Boolean(userId),
  });
}

type UpdateVariables = {
  update: ProfileUpdate;
  completeOnboarding?: boolean;
};

export function useUpdateProfile(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ update, completeOnboarding }: UpdateVariables): Promise<Profile> => {
      return updateProfile(userId, update, { completeOnboarding });
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.detail(userId), profile);
    },
  });
}

export function useCheckUsername(userId: string) {
  return useMutation({
    mutationFn: (username: string) => isUsernameTaken(username, userId),
  });
}
