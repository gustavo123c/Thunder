import { useQuery } from '@tanstack/react-query';

import { fetchActivity } from '../api/activity.api';

/**
 * Under the ['runs'] prefix, so uploading or deleting a run (which invalidates
 * ['runs']) recalculates the streak and the dashboard automatically.
 */
export const activityKey = (userId: string) => ['runs', 'activity', userId] as const;

export function useActivity(userId: string) {
  return useQuery({ queryKey: activityKey(userId), queryFn: () => fetchActivity(userId) });
}
