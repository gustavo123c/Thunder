import type { TrackInterval } from '../types/run';

/**
 * Speed (km/h) → MET for walking/running, from the 2011 Compendium of Physical Activities
 * (codes 17xxx walking, 12xxx running). Linear interpolation between points;
 * clamped at both ends.
 */
const MET_TABLE: readonly (readonly [kmh: number, met: number])[] = [
  [3.2, 2.8],
  [4.0, 3.0],
  [4.8, 3.5],
  [5.6, 4.3],
  [6.4, 5.0],
  [7.2, 6.0], // brisk walk / easy jog transition
  [8.0, 8.3],
  [8.4, 9.0],
  [9.7, 9.8],
  [10.8, 10.5],
  [11.3, 11.0],
  [12.1, 11.8],
  [12.9, 12.3],
  [13.8, 12.8],
  [14.5, 14.5],
  [16.1, 16.0],
  [17.7, 19.0],
  [19.3, 19.8],
  [20.9, 23.0],
];

export function metForSpeedKmh(speedKmh: number): number {
  const first = MET_TABLE[0] as readonly [number, number];
  const last = MET_TABLE[MET_TABLE.length - 1] as readonly [number, number];
  if (!Number.isFinite(speedKmh) || speedKmh <= first[0]) return first[1];
  if (speedKmh >= last[0]) return last[1];

  for (let i = 1; i < MET_TABLE.length; i += 1) {
    const [x1, y1] = MET_TABLE[i] as readonly [number, number];
    if (speedKmh <= x1) {
      const [x0, y0] = MET_TABLE[i - 1] as readonly [number, number];
      return y0 + ((y1 - y0) * (speedKmh - x0)) / (x1 - x0);
    }
  }
  return last[1];
}

/** kcal = MET × body mass (kg) × hours. */
export function caloriesForActivity(met: number, weightKg: number, durationS: number): number {
  return met * weightKg * (durationS / 3600);
}

/**
 * Estimated kcal for a run, integrating MET over each moving interval so that
 * intervals of fast running weigh more than slow ones. Standing time is ignored.
 * Returns null without a body weight — the UI should not invent one.
 */
export function estimateCaloriesKcal(
  intervals: readonly TrackInterval[],
  weightKg: number | null,
): number | null {
  if (weightKg === null || !Number.isFinite(weightKg) || weightKg <= 0) return null;

  return intervals.reduce((sum, interval) => {
    if (!interval.moving) return sum;
    const speedKmh = (interval.distanceM / interval.durationS) * 3.6;
    return sum + caloriesForActivity(metForSpeedKmh(speedKmh), weightKg, interval.durationS);
  }, 0);
}
