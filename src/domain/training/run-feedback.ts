import type { BodyRegion, PainEntry } from '../health/body-regions';

export type FeedbackIssue =
  | 'breath'
  | 'pain'
  | 'pace_hard'
  | 'pace_easy'
  | 'short_time'
  | 'motivation'
  | 'nothing'
  | 'other';

export type NextPreference = 'lighter' | 'same';

export interface RunFeedback {
  id: string;
  runId: string;
  userId: string;
  issues: FeedbackIssue[];
  painRegions?: PainEntry[];
  otherText?: string;
  nextPreference?: NextPreference;
  safetyAlert: boolean;
  generatedWorkoutId?: string;
  createdAt: string;
}

export interface RunFeedbackDraft {
  issues: FeedbackIssue[];
  painRegions: PainEntry[];
  otherText: string;
  nextPreference: NextPreference | null;
}

export const FEEDBACK_LABELS: Record<FeedbackIssue, string> = {
  breath: 'Falta de ar / cansaço',
  pain: 'Dor',
  pace_hard: 'Ritmo muito difícil',
  pace_easy: 'Ritmo muito fácil',
  short_time: 'Pouco tempo',
  motivation: 'Desmotivação',
  nothing: 'Nada, foi ótimo',
  other: 'Outro',
};

export const SAFETY_REGIONS: BodyRegion[] = ['chest'];

/** Returns true if the draft contains a pain region that warrants a safety alert. */
export function hasSafetyRisk(draft: RunFeedbackDraft): boolean {
  if (draft.issues.includes('pain')) {
    return draft.painRegions.some((p) => (SAFETY_REGIONS as string[]).includes(p.region));
  }
  return false;
}
