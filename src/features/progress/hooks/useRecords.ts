import { useMemo } from 'react';

import { computeWinStreak } from '@/domain/insights/activity';
import {
  computePersonalRecords,
  longestEfforts,
  longestWeekStreak,
} from '@/domain/insights/records';

import { useActivity } from './useActivity';

/** Personal records and consistency figures derived from the activity window. */
export function useRecords(userId: string) {
  const activity = useActivity(userId);
  const data = useMemo(() => {
    if (!activity.data) return null;
    return {
      records: computePersonalRecords(activity.data),
      efforts: longestEfforts(activity.data),
      longestWeekStreak: longestWeekStreak(activity.data),
      streak: computeWinStreak(activity.data, new Date()),
    };
  }, [activity.data]);
  return { data, isError: activity.isError, isPending: activity.isPending };
}
