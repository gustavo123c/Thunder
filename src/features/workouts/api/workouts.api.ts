import { randomUUID } from 'expo-crypto';

import { BODY_REGIONS, type BodyRegion } from '@/domain/health/body-regions';
import type { WorkoutPlan, WorkoutRequest } from '@/domain/training/workout-generator';
import { supabase } from '@/services/supabase/client';
import type { Json, WorkoutFeedback } from '@/services/supabase/database.types';

export type { WorkoutFeedback };

export type SavedWorkout = {
  id: string;
  createdAt: string;
  generator: 'rules' | 'ai';
  plan: WorkoutPlan;
  /** Body regions that hurt when the workout was generated. */
  painRegions: BodyRegion[];
  feedback: WorkoutFeedback | null;
};

function isPlan(value: unknown): value is WorkoutPlan {
  if (typeof value !== 'object' || value === null) return false;
  const plan = value as Partial<WorkoutPlan>;
  return typeof plan.title === 'string' && Array.isArray(plan.blocks);
}

/** Regions listed in a stored request (tolerant: old or malformed rows give []). */
function painRegionsOf(request: unknown): BodyRegion[] {
  if (typeof request !== 'object' || request === null) return [];
  const pains = (request as { pains?: unknown }).pains;
  if (!Array.isArray(pains)) return [];
  return pains
    .map((p) => (typeof p === 'object' && p !== null ? (p as { region?: unknown }).region : null))
    .filter((r): r is BodyRegion => (BODY_REGIONS as readonly unknown[]).includes(r));
}

/** New id for a workout, created on the device so it can be started before it is saved. */
export function newWorkoutId(): string {
  return randomUUID();
}

export async function saveWorkout(
  userId: string,
  request: WorkoutRequest,
  plan: WorkoutPlan,
  id: string = newWorkoutId(),
): Promise<void> {
  const { error } = await supabase.from('generated_workouts').insert({
    id,
    user_id: userId,
    generator: 'rules',
    request: request as unknown as Json,
    plan: plan as unknown as Json,
  });
  if (error) throw error;
}

export async function fetchRecentWorkouts(userId: string, limit = 20): Promise<SavedWorkout[]> {
  const { data, error } = await supabase
    .from('generated_workouts')
    .select('id, created_at, generator, plan, request, feedback')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? [])
    .filter((row) => isPlan(row.plan))
    .map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      generator: row.generator,
      plan: row.plan as unknown as WorkoutPlan,
      painRegions: painRegionsOf(row.request),
      feedback: row.feedback,
    }));
}

/** Post-workout check-in ("Como você se sentiu com esse treino?"). */
export async function saveWorkoutFeedback(
  workoutId: string,
  feedback: WorkoutFeedback,
  runId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('generated_workouts')
    .update({ feedback, feedback_at: new Date().toISOString(), run_id: runId })
    .eq('id', workoutId);
  if (error) throw error;
}

export async function deleteWorkout(id: string): Promise<void> {
  const { error } = await supabase.from('generated_workouts').delete().eq('id', id);
  if (error) throw error;
}

/** Removes every saved workout of the user (RLS limits it to their own rows anyway). */
export async function deleteAllWorkouts(userId: string): Promise<void> {
  const { error } = await supabase.from('generated_workouts').delete().eq('user_id', userId);
  if (error) throw error;
}
