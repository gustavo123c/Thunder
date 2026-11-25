import type { GpsSample, Split, TrackInterval } from '../types/run';
import { METRICS_CONFIG } from './config';

type SplitOptions = {
  splitDistanceM?: number;
  minPartialDistanceM?: number;
};

function interpolateAltitude(from: GpsSample, to: GpsSample, fraction: number): number | null {
  if (from.altitudeM === null || to.altitudeM === null) return null;
  return from.altitudeM + (to.altitudeM - from.altitudeM) * fraction;
}

/**
 * Per-kilometer splits. Boundaries are interpolated inside the interval that crosses
 * them, so a split is exactly 1000 m regardless of GPS sampling rate.
 * Durations use moving time, consistent with the average pace.
 */
export function computeSplits(
  intervals: readonly TrackInterval[],
  {
    splitDistanceM = METRICS_CONFIG.splits.distanceM,
    minPartialDistanceM = METRICS_CONFIG.splits.minPartialDistanceM,
  }: SplitOptions = {},
): Split[] {
  const splits: Split[] = [];

  let distanceM = 0;
  let durationS = 0;
  let startAltitude: number | null = intervals[0]?.from.altitudeM ?? null;
  let lastAltitude: number | null = startAltitude;

  const closeSplit = (endAltitude: number | null) => {
    if (durationS > 0) {
      splits.push({
        index: splits.length,
        distanceM,
        durationS,
        paceSPerKm: durationS / (distanceM / 1000),
        elevationDeltaM:
          startAltitude !== null && endAltitude !== null ? endAltitude - startAltitude : null,
      });
    }
    distanceM = 0;
    durationS = 0;
    startAltitude = endAltitude;
  };

  for (const interval of intervals) {
    const timePerMeter =
      interval.moving && interval.distanceM > 0 ? interval.durationS / interval.distanceM : 0;
    let consumedFraction = 0;
    let remainingM = interval.distanceM;

    while (distanceM + remainingM >= splitDistanceM && remainingM > 0) {
      const neededM = splitDistanceM - distanceM;
      distanceM += neededM;
      durationS += neededM * timePerMeter;
      remainingM -= neededM;
      consumedFraction += neededM / interval.distanceM;
      closeSplit(interpolateAltitude(interval.from, interval.to, consumedFraction));
    }

    distanceM += remainingM;
    durationS += remainingM * timePerMeter;
    lastAltitude = interval.to.altitudeM;
    if (startAltitude === null) startAltitude = interval.from.altitudeM;
  }

  if (distanceM >= minPartialDistanceM) closeSplit(lastAltitude);

  return splits;
}

/** Fastest complete split, in s/km. Null until the first full kilometer. */
export function bestSplitPaceSPerKm(
  splits: readonly Split[],
  splitDistanceM: number = METRICS_CONFIG.splits.distanceM,
): number | null {
  const full = splits.filter((split) => split.distanceM >= splitDistanceM - 1e-6);
  if (full.length === 0) return null;
  return Math.min(...full.map((split) => split.paceSPerKm));
}
