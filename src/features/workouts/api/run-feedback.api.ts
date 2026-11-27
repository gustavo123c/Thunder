import type { PainEntry } from '@/domain/health/body-regions';
import type { FeedbackIssue, NextPreference } from '@/domain/training/run-feedback';
import { supabase } from '@/services/supabase/client';

export interface SaveFeedbackInput {
  runId: string;
  userId: string;
  issues: FeedbackIssue[];
  painRegions?: PainEntry[];
  otherText?: string;
  nextPreference?: NextPreference;
  safetyAlert: boolean;
  generatedWorkoutId?: string;
}

export async function saveRunFeedback(input: SaveFeedbackInput): Promise<void> {
  const { error } = await supabase.from('run_feedback').insert({
    run_id: input.runId,
    user_id: input.userId,
    issues: input.issues,
    pain_regions: input.painRegions ?? null,
    other_text: input.otherText ?? null,
    next_preference: input.nextPreference ?? null,
    safety_alert: input.safetyAlert,
    generated_workout_id: input.generatedWorkoutId ?? null,
  });
  if (error) throw error;
}
