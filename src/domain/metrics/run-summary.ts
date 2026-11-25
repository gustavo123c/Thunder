import type { ActivePeriod, GpsSample, RunSummary } from '../types/run';
import { estimateCaloriesKcal } from './calories';
import { elevationGainM } from './elevation';
import { buildIntervals, movingTimeS, totalDistanceM } from './intervals';
import { paceSPerKm } from './pace';
import { activeTimeS, elapsedTimeS } from './session-time';
import { bestSplitPaceSPerKm, computeSplits } from './splits';

type SummaryInput = {
  /** Samples already accepted by the GPS filter, in chronological order. */
  samples: readonly GpsSample[];
  /** Start/resume → pause/finish periods; the last one must be closed. */
  periods: readonly ActivePeriod[];
  weightKg: number | null;
};

/** Everything shown on the post-run screen and persisted to `runs` / `run_splits`. */
export function summarizeRun({ samples, periods, weightKg }: SummaryInput): RunSummary {
  const first = periods[0];
  const last = periods[periods.length - 1];
  if (!first || !last || last.endedAt === null) {
    throw new Error('summarizeRun requires at least one closed active period');
  }

  const intervals = buildIntervals(samples);
  const distanceM = totalDistanceM(intervals);
  const moving = movingTimeS(intervals);
  const splits = computeSplits(intervals);

  return {
    startedAt: first.startedAt,
    endedAt: last.endedAt,
    distanceM,
    elapsedTimeS: elapsedTimeS(periods, last.endedAt),
    activeTimeS: activeTimeS(periods, last.endedAt),
    movingTimeS: moving,
    avgPaceSPerKm: paceSPerKm(distanceM, moving),
    bestPaceSPerKm: bestSplitPaceSPerKm(splits),
    elevationGainM: elevationGainM(samples),
    caloriesKcal: estimateCaloriesKcal(intervals, weightKg),
    splits,
  };
}
