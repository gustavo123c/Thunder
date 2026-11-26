import {
  BODY_REGIONS,
  type BodyRegion,
  type BodySide,
  type PainEntry,
} from '@/domain/health/body-regions';
import type { PainEpisode } from '@/domain/health/pain-history';
import { supabase } from '@/services/supabase/client';

export type PainLog = PainEntry & { id: string; createdAt: string };

function isRegion(value: string): value is BodyRegion {
  return (BODY_REGIONS as readonly string[]).includes(value);
}

/** Open (unresolved) pains of the signed-in user. */
export async function fetchOpenPains(userId: string): Promise<PainLog[]> {
  const { data, error } = await supabase
    .from('pain_logs')
    .select('id, region, side, intensity, created_at')
    .eq('user_id', userId)
    .is('resolved_at', null)
    .order('created_at');
  if (error) throw error;
  return (data ?? [])
    .filter((row) => isRegion(row.region))
    .map((row) => ({
      id: row.id,
      region: row.region as BodyRegion,
      side: row.side,
      intensity: row.intensity,
      createdAt: row.created_at,
    }));
}

/** Records a pain, or updates the intensity of the open entry for that region/side. */
export async function setPain(
  userId: string,
  existing: PainLog | undefined,
  region: BodyRegion,
  side: BodySide,
  intensity: number,
): Promise<void> {
  if (existing) {
    const { error } = await supabase.from('pain_logs').update({ intensity }).eq('id', existing.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from('pain_logs')
    .insert({ user_id: userId, region, side, intensity });
  if (error) throw error;
}

/** Marks a pain as gone (kept for history). */
export async function resolvePain(id: string): Promise<void> {
  const { error } = await supabase
    .from('pain_logs')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** Every pain episode (open and resolved) of the last `days` days, newest first. */
export async function fetchPainHistory(userId: string, days = 90): Promise<PainEpisode[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('pain_logs')
    .select('id, region, side, intensity, created_at, resolved_at')
    .eq('user_id', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .filter((row) => isRegion(row.region))
    .map((row) => ({
      id: row.id,
      region: row.region as BodyRegion,
      side: row.side,
      intensity: row.intensity,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
    }));
}
