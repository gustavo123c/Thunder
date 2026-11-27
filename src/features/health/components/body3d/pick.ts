import { parseZoneName, type ZoneRef } from '@/domain/health/body-zones';

type Hit = { object: { userData: { zone?: string } } };

/**
 * The zone under the finger: the first surface hit decides. Touching the neutral body (or
 * a zone hidden behind it) selects nothing.
 */
export function zoneFromHits(hits: readonly Hit[]): ZoneRef | null {
  const first = hits[0];
  if (!first?.object.userData.zone) return null;
  return parseZoneName(first.object.userData.zone);
}

/** A touch is a tap (not a drag) when it barely moved and was short. */
export function isTap(dx: number, dy: number, durationMs: number): boolean {
  return Math.hypot(dx, dy) < 8 && durationMs < 350;
}
