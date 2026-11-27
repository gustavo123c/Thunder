import type { Anamnese, AnamneseDraft } from '@/domain/health/anamnese';
import { computeParQRisk } from '@/domain/health/anamnese';
import { supabase } from '@/services/supabase/client';

function rowToAnamnese(row: Record<string, unknown>): Anamnese {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    runningExperience: (row.running_experience as Anamnese['runningExperience']) ?? null,
    weeklyFrequency: (row.weekly_frequency as number) ?? null,
    currentInjuries: (row.current_injuries as string[]) ?? [],
    pastInjuries: (row.past_injuries as string[]) ?? [],
    surgeries: (row.surgeries as string) ?? '',
    healthConditions: (row.health_conditions as string[]) ?? [],
    medications: (row.medications as string) ?? '',
    parQ: (row.par_q as Anamnese['parQ']) ?? {},
    parQRisk: (row.par_q_risk as boolean) ?? false,
    consented: row.consented_at !== null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function fetchAnamnese(userId: string): Promise<Anamnese | null> {
  const { data, error } = await supabase
    .from('health_anamnese')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToAnamnese(data as Record<string, unknown>);
}

export async function upsertAnamnese(userId: string, draft: AnamneseDraft): Promise<void> {
  const parQRisk = computeParQRisk(draft.parQ);
  const { error } = await supabase.from('health_anamnese').upsert(
    {
      user_id: userId,
      running_experience: draft.runningExperience,
      weekly_frequency: draft.weeklyFrequency,
      current_injuries: draft.currentInjuries,
      past_injuries: draft.pastInjuries,
      surgeries: draft.surgeries || null,
      health_conditions: draft.healthConditions,
      medications: draft.medications || null,
      par_q: draft.parQ,
      par_q_risk: parQRisk,
      consented_at: draft.consented ? new Date().toISOString() : null,
    },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
}

export async function deleteAnamnese(userId: string): Promise<void> {
  const { error } = await supabase.from('health_anamnese').delete().eq('user_id', userId);
  if (error) throw error;
}
