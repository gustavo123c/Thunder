import { activityWindowStart } from '@/domain/insights/activity';
import { supabase } from '@/services/supabase/client';
import { type ActivityItem, parseActivity } from '@/services/supabase/run-json';

/** Runs since the start of last year — enough for every dashboard period and the streak. */
export async function fetchActivity(userId: string, now = new Date()): Promise<ActivityItem[]> {
  const { data, error } = await supabase.rpc('list_activity', {
    p_user_id: userId,
    p_since: activityWindowStart(now).toISOString(),
  });
  if (error) throw error;
  return parseActivity(data);
}
