import type { ActivePeriod } from '../types/run';

/**
 * Time the run has been active (start/resume → pause/finish), in seconds.
 * This is the live timer shown while running: it stops when the user pauses.
 */
export function activeTimeS(periods: readonly ActivePeriod[], now: number): number {
  const totalMs = periods.reduce((sum, period) => {
    const end = period.endedAt ?? now;
    return sum + Math.max(0, end - period.startedAt);
  }, 0);
  return totalMs / 1000;
}

/** Wall-clock time from the first start to the finish (pauses included), in seconds. */
export function elapsedTimeS(periods: readonly ActivePeriod[], now: number): number {
  const first = periods[0];
  if (!first) return 0;
  const last = periods[periods.length - 1] as ActivePeriod;
  return Math.max(0, (last.endedAt ?? now) - first.startedAt) / 1000;
}
