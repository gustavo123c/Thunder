import type { TrackInterval } from '../types/run';
import { METRICS_CONFIG } from './config';

/** Seconds per km for a distance covered in a duration; null when not meaningful. */
export function paceSPerKm(
  distanceM: number,
  durationS: number,
  minDistanceM: number = METRICS_CONFIG.pace.averageMinDistanceM,
): number | null {
  if (!Number.isFinite(distanceM) || !Number.isFinite(durationS)) return null;
  if (distanceM < minDistanceM || durationS <= 0) return null;
  return durationS / (distanceM / 1000);
}

export function speedMpsToPace(speedMps: number): number | null {
  if (!Number.isFinite(speedMps) || speedMps <= 0) return null;
  return 1000 / speedMps;
}

type CurrentPaceOptions = {
  windowS?: number;
  minDistanceM?: number;
};

/**
 * Live pace over the last `windowS` seconds of the *current* segment, using moving time.
 * Returns null right after start/resume, when standing still, or with too little data —
 * the UI shows "--" instead of a wildly wrong number.
 */
export function currentPaceSPerKm(
  intervals: readonly TrackInterval[],
  {
    windowS = METRICS_CONFIG.pace.currentWindowS,
    minDistanceM = METRICS_CONFIG.pace.currentMinDistanceM,
  }: CurrentPaceOptions = {},
): number | null {
  const last = intervals[intervals.length - 1];
  if (!last) return null;

  const segment = last.to.segment;
  const windowStart = last.to.timestamp - windowS * 1000;

  let distanceM = 0;
  let durationS = 0;

  for (let i = intervals.length - 1; i >= 0; i -= 1) {
    const interval = intervals[i] as TrackInterval;
    if (interval.to.segment !== segment || interval.to.timestamp <= windowStart) break;
    if (!interval.moving) continue;

    // Only the part of the interval inside the window counts.
    const clippedStart = Math.max(interval.from.timestamp, windowStart);
    const fraction = (interval.to.timestamp - clippedStart) / (interval.durationS * 1000);
    distanceM += interval.distanceM * fraction;
    durationS += interval.durationS * fraction;
  }

  return paceSPerKm(distanceM, durationS, minDistanceM);
}
