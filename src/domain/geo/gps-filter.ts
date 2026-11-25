import { METRICS_CONFIG } from '../metrics/config';
import type { GpsSample } from '../types/run';
import { haversineDistanceM } from './haversine';

export type GpsFilterConfig = typeof METRICS_CONFIG.gps;

export type GpsRejectReason = 'invalid' | 'out_of_order' | 'low_accuracy' | 'jump' | 'jitter';

export type GpsFilterState = {
  lastAccepted: GpsSample | null;
  consecutiveJumpRejections: number;
};

export type GpsFilterResult =
  | { accepted: true; state: GpsFilterState }
  | { accepted: false; reason: GpsRejectReason; state: GpsFilterState };

export const INITIAL_GPS_FILTER_STATE: GpsFilterState = {
  lastAccepted: null,
  consecutiveJumpRejections: 0,
};

function isValidCoordinate(sample: GpsSample): boolean {
  return (
    Number.isFinite(sample.latitude) &&
    Number.isFinite(sample.longitude) &&
    Math.abs(sample.latitude) <= 90 &&
    Math.abs(sample.longitude) <= 180 &&
    Number.isFinite(sample.timestamp)
  );
}

function accept(sample: GpsSample): GpsFilterResult {
  return { accepted: true, state: { lastAccepted: sample, consecutiveJumpRejections: 0 } };
}

function reject(reason: GpsRejectReason, state: GpsFilterState): GpsFilterResult {
  return { accepted: false, reason, state };
}

/**
 * Decides whether a new fix should be kept. Pure: returns the next state.
 *
 * Rules, in order:
 * 1. invalid coordinates / timestamps are dropped;
 * 2. fixes older than the last accepted one are dropped;
 * 3. fixes with poor accuracy are dropped;
 * 4. the first fix of a segment is always kept (no previous point to compare);
 * 5. implied speed above `maxSpeedMps` is a GPS jump — unless it keeps happening,
 *    which means the *previous* point was the bad one, so we trust the new position;
 * 6. tiny moves are jitter, except every `heartbeatS` so elapsed time stays accurate.
 */
export function applyGpsFilter(
  state: GpsFilterState,
  sample: GpsSample,
  config: GpsFilterConfig = METRICS_CONFIG.gps,
): GpsFilterResult {
  if (!isValidCoordinate(sample)) return reject('invalid', state);

  const previous = state.lastAccepted;
  if (previous && sample.timestamp <= previous.timestamp) return reject('out_of_order', state);

  if (sample.accuracyM !== null && sample.accuracyM > config.maxAccuracyM) {
    return reject('low_accuracy', state);
  }

  if (!previous || previous.segment !== sample.segment) return accept(sample);

  const distanceM = haversineDistanceM(previous, sample);
  const durationS = (sample.timestamp - previous.timestamp) / 1000;

  // Allow for the accuracy radius of both fixes before calling it a jump.
  const uncertaintyM = (previous.accuracyM ?? 0) + (sample.accuracyM ?? 0);
  const impliedSpeed = Math.max(0, distanceM - uncertaintyM) / durationS;
  if (impliedSpeed > config.maxSpeedMps) {
    const rejections = state.consecutiveJumpRejections + 1;
    if (rejections >= config.maxConsecutiveJumpRejections) return accept(sample);
    return reject('jump', { ...state, consecutiveJumpRejections: rejections });
  }

  if (distanceM < config.minDistanceM && durationS < config.heartbeatS) {
    return reject('jitter', state);
  }

  return accept(sample);
}

/** Runs the filter over a whole track (e.g. when restoring a run from local storage). */
export function filterGpsSamples(
  samples: readonly GpsSample[],
  config: GpsFilterConfig = METRICS_CONFIG.gps,
): GpsSample[] {
  const kept: GpsSample[] = [];
  let state = INITIAL_GPS_FILTER_STATE;
  for (const sample of samples) {
    const result = applyGpsFilter(state, sample, config);
    state = result.state;
    if (result.accepted) kept.push(sample);
  }
  return kept;
}
