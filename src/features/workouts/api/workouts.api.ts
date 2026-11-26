import type { WorkoutPlan, WorkoutRequest } from '@/domain/training/workout-generator';
import { supabase } from '@/services/supabase/client';
import type { Json } from '@/services/supabase/database.types';

export type SavedWorkout = {
  id: string;
  createdAt: string;
  generator: 'rules' | 'ai';
  plan: WorkoutPlan;
};

function isPlan(value: unknown): value is WorkoutPlan {
  if (typeof value !== 'object' || value === null) return false;
  const plan = value as Partial<WorkoutPlan>;
  return typeof plan.title === 'string' && Array.isArray(plan.blocks);
}

export async function saveWorkout(
  userId: string,
  request: WorkoutRequest,
  plan: WorkoutPlan,
): Promise<void> {
  const { error } = await supabase.from('generated_workouts').insert({
    user_id: userId,
    generator: 'rules',
    request: request as unknown as Json,
    plan: plan as unknown as Json,
  });
  if (error) throw error;
}

export async function fetchRecentWorkouts(userId: string, limit = 5): Promise<SavedWorkout[]> {
  const { data, error } = await supabase
    .from('generated_workouts')
    .select('id, created_at, generator, plan')
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
    }));
}

export async function deleteWorkout(id: string): Promise<void> {
  const { error } = await supabase.from('generated_workouts').delete().eq('id', id);
  if (error) throw error;
}
