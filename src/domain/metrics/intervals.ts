import { haversineDistanceM } from '../geo/haversine';
import type { GpsSample, TrackInterval } from '../types/run';
import { METRICS_CONFIG } from './config';

type IntervalConfig = {
  minMovingSpeedMps: number;
  maxSpeedMps: number;
};

const DEFAULT_INTERVAL_CONFIG: IntervalConfig = {
  minMovingSpeedMps: METRICS_CONFIG.moving.minSpeedMps,
  maxSpeedMps: METRICS_CONFIG.gps.maxSpeedMps,
};

/**
 * Turns filtered samples into intervals between consecutive points of the same segment.
 * Pause gaps (segment changes) never produce an interval. All metrics derive from this.
 *
 * An interval faster than `maxSpeedMps` only happens when the GPS filter re-anchored after
 * a bad fix; its distance is not trusted, so it is zeroed and marked as not moving.
 */
export function buildIntervals(
  samples: readonly GpsSample[],
  config: IntervalConfig = DEFAULT_INTERVAL_CONFIG,
): TrackInterval[] {
  const intervals: TrackInterval[] = [];

  for (let i = 1; i < samples.length; i += 1) {
    const from = samples[i - 1] as GpsSample;
    const to = samples[i] as GpsSample;
    if (from.segment !== to.segment) continue;

    const durationS = (to.timestamp - from.timestamp) / 1000;
    if (durationS <= 0) continue;

    const rawDistanceM = haversineDistanceM(from, to);
    const speed = rawDistanceM / durationS;
    const trusted = speed <= config.maxSpeedMps;

    intervals.push({
      from,
      to,
      distanceM: trusted ? rawDistanceM : 0,
      durationS,
      moving: trusted && speed >= config.minMovingSpeedMps,
    });
  }

  return intervals;
}

export function totalDistanceM(intervals: readonly TrackInterval[]): number {
  return intervals.reduce((sum, interval) => sum + interval.distanceM, 0);
}

export function movingTimeS(intervals: readonly TrackInterval[]): number {
  return intervals.reduce((sum, interval) => sum + (interval.moving ? interval.durationS : 0), 0);
}
