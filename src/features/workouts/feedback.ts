import type { BodyRegion, PainEntry } from '@/domain/health/body-regions';
import type { Recurrence } from '@/domain/health/pain-history';

import type { SavedWorkout } from './api/workouts.api';

/** Check-in answers from this many days ago still shape the next workout. */
export const FEEDBACK_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/** Regions of recent workouts whose check-in said "Ainda sinto desconforto". */
export function recentDiscomfortRegions(
  workouts: readonly SavedWorkout[],
  now: number = Date.now(),
): BodyRegion[] {
  const regions = new Set<BodyRegion>();
  workouts
    .filter(
      (w) =>
        w.feedback === 'discomfort' && now - new Date(w.createdAt).getTime() <= FEEDBACK_WINDOW_MS,
    )
    .forEach((w) => w.painRegions.forEach((r) => regions.add(r)));
  return [...regions];
}

/**
 * A recurring pain that is open right now and already had a workout adapted for it
 * ("Essa dor voltou — repetir o treino anterior?").
 */
export function findReturningPain(
  recurring: readonly Recurrence[],
  openPains: readonly PainEntry[],
  workouts: readonly SavedWorkout[],
): { recurrence: Recurrence; previous: SavedWorkout } | null {
  for (const recurrence of recurring) {
    const open = openPains.some(
      (p) => p.region === recurrence.region && p.side === recurrence.side,
    );
    if (!open) continue;
    const previous = workouts.find(
      (w) => w.painRegions.includes(recurrence.region) && w.plan.sessionType !== 'rest',
    );
    if (previous) return { recurrence, previous };
  }
  return null;
}
