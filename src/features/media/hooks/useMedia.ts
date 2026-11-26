import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { RunMediaItem } from '@/domain/types/run';

import {
  addRunMedia,
  type PickedMediaWithSize,
  removeRunMedia,
  uploadAvatar,
} from '../api/media.api';

export function useUploadAvatar(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (asset: PickedMediaWithSize) => uploadAvatar(userId, asset),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile', userId] }),
        queryClient.invalidateQueries({ queryKey: ['profiles'] }),
        queryClient.invalidateQueries({ queryKey: ['runs'] }), // author avatars in feed/detail
      ]),
  });
}

export type UploadOutcome = { uploaded: number; failed: unknown[] };

/** Uploads picked items one by one so a single failure doesn't lose the others. */
export function useAddRunMedia(userId: string, runId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assets,
      existingCount,
    }: {
      assets: PickedMediaWithSize[];
      existingCount: number;
    }): Promise<UploadOutcome> => {
      const outcome: UploadOutcome = { uploaded: 0, failed: [] };
      for (const asset of assets) {
        try {
          await addRunMedia(userId, runId, asset, existingCount + outcome.uploaded);
          outcome.uploaded += 1;
        } catch (error) {
          outcome.failed.push(error);
        }
      }
      return outcome;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['runs'] }),
  });
}

export function useRemoveRunMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: RunMediaItem) => removeRunMedia(item),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['runs'] }),
  });
}
