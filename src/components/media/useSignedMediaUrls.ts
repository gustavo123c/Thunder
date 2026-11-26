import { useQuery } from '@tanstack/react-query';

import { BUCKETS, signedUrls } from '@/services/storage/storage';

const ONE_HOUR_S = 60 * 60;

/** Signed URLs for run media (private bucket). Cached for 50 min, links last 60. */
export function useSignedMediaUrls(paths: readonly string[]) {
  const sorted = [...paths].sort();
  return useQuery({
    queryKey: ['media-urls', ...sorted],
    queryFn: () => signedUrls(BUCKETS.workoutMedia, sorted, ONE_HOUR_S),
    enabled: sorted.length > 0,
    staleTime: 50 * 60 * 1000,
  });
}
