/** Test-only helpers to generate synthetic GPS tracks with known distances and speeds. */
import { EARTH_RADIUS_M } from '../geo/haversine';
import type { GpsSample } from '../types/run';

export const METERS_PER_DEGREE_LAT = (Math.PI / 180) * EARTH_RADIUS_M;

export const T0 = Date.UTC(2026, 10, 25, 9, 0, 0); // 2026-11-25 09:00 UTC

type TrackOptions = {
  startLat?: number;
  startLon?: number;
  startTime?: number;
  speedMps: number;
  durationS: number;
  intervalS?: number;
  segment?: number;
  accuracyM?: number | null;
  altitude?: (elapsedS: number) => number | null;
};

/** A straight run due north at constant speed, one sample every `intervalS`. */
export function straightTrack({
  startLat = -23.55,
  startLon = -46.63,
  startTime = T0,
  speedMps,
  durationS,
  intervalS = 1,
  segment = 0,
  accuracyM = 5,
  altitude = () => 760,
}: TrackOptions): GpsSample[] {
  const samples: GpsSample[] = [];
  for (let t = 0; t <= durationS + 1e-9; t += intervalS) {
    samples.push({
      timestamp: startTime + t * 1000,
      latitude: startLat + (speedMps * t) / METERS_PER_DEGREE_LAT,
      longitude: startLon,
      altitudeM: altitude(t),
      accuracyM,
      speedMps,
      segment,
    });
  }
  return samples;
}

export function lastOf<T>(items: readonly T[]): T {
  const item = items[items.length - 1];
  if (item === undefined) throw new Error('empty list');
  return item;
}

/** Continues a track from its last sample (same direction), optionally in a new segment. */
export function continueTrack(
  previous: readonly GpsSample[],
  options: Omit<TrackOptions, 'startLat' | 'startLon' | 'startTime'> & { gapS?: number },
): GpsSample[] {
  const last = lastOf(previous);
  const { gapS = options.intervalS ?? 1, ...rest } = options;
  return straightTrack({
    ...rest,
    startLat:
      last.latitude +
      ((options.segment ?? last.segment) === last.segment
        ? (options.speedMps * gapS) / METERS_PER_DEGREE_LAT
        : 0),
    startLon: last.longitude,
    startTime: last.timestamp + gapS * 1000,
  });
}
