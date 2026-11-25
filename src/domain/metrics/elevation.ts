import type { GpsSample } from '../types/run';
import { METRICS_CONFIG } from './config';

/** Centered moving average over the available altitudes (window = 2·radius + 1 samples). */
export function smoothAltitudes(altitudes: readonly number[], radius: number): number[] {
  return altitudes.map((_, i) => {
    const start = Math.max(0, i - radius);
    const end = Math.min(altitudes.length - 1, i + radius);
    let sum = 0;
    for (let j = start; j <= end; j += 1) sum += altitudes[j] as number;
    return sum / (end - start + 1);
  });
}

/**
 * Total climb in meters. GPS altitude is noisy (±5 m is common), so it is first
 * smoothed with a moving average and then accumulated with hysteresis: only rises
 * larger than `thresholdM` above the last reference count. Null without altitude data.
 */
export function elevationGainM(
  samples: readonly GpsSample[],
  {
    thresholdM = METRICS_CONFIG.elevation.thresholdM,
    smoothingRadius = METRICS_CONFIG.elevation.smoothingRadius,
  }: { thresholdM?: number; smoothingRadius?: number } = {},
): number | null {
  const altitudes = samples
    .map((sample) => sample.altitudeM)
    .filter((altitude): altitude is number => altitude !== null && Number.isFinite(altitude));
  if (altitudes.length === 0) return null;

  const smoothed = smoothAltitudes(altitudes, smoothingRadius);
  let reference = smoothed[0] as number;
  let gain = 0;

  for (const altitude of smoothed) {
    if (altitude > reference + thresholdM) {
      gain += altitude - reference;
      reference = altitude;
    } else if (altitude < reference - thresholdM) {
      reference = altitude;
    }
  }

  return gain;
}
