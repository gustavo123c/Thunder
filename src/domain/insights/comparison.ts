import type { RunHistoryEntry } from '../types/run';

export const COMPARISON_CONFIG = {
  /** Runs within ±20% of the distance are "similar" for pace comparison. */
  similarDistanceTolerance: 0.2,
  /** How many similar runs form the baseline. */
  similarSampleSize: 10,
  /** Pace differences below this are reported as "same pace" (noise). */
  paceNoiseSPerKm: 3,
} as const;

export type PaceTrend = 'faster' | 'slower' | 'same';

export type RunComparison = {
  /** Versus the most recent earlier run. */
  previous: { distanceDeltaM: number; paceDeltaSPerKm: number | null } | null;
  /** Versus the average of recent runs of similar distance. */
  similar: {
    count: number;
    avgPaceSPerKm: number;
    paceDeltaSPerKm: number; // negative = faster than usual
    trend: PaceTrend;
  } | null;
  records: {
    longestRun: boolean;
    fastestKm: boolean;
    fastestPaceForDistance: boolean;
  };
  isFirstRun: boolean;
};

function trendOf(deltaSPerKm: number): PaceTrend {
  if (Math.abs(deltaSPerKm) < COMPARISON_CONFIG.paceNoiseSPerKm) return 'same';
  return deltaSPerKm < 0 ? 'faster' : 'slower';
}

function isSimilarDistance(a: number, b: number): boolean {
  if (a <= 0 || b <= 0) return false;
  return Math.abs(a - b) / a <= COMPARISON_CONFIG.similarDistanceTolerance;
}

/**
 * Compares a run with the athlete's earlier runs (`previous`, newest first).
 * Pure: the caller decides how to phrase the result.
 */
export function compareWithHistory(
  current: RunHistoryEntry,
  previous: readonly RunHistoryEntry[],
): RunComparison {
  const earlier = previous.filter((run) => run.id !== current.id);
  const last = earlier[0];

  const similarRuns = earlier
    .filter(
      (run) => run.avgPaceSPerKm !== null && isSimilarDistance(current.distanceM, run.distanceM),
    )
    .slice(0, COMPARISON_CONFIG.similarSampleSize);

  let similar: RunComparison['similar'] = null;
  if (similarRuns.length > 0 && current.avgPaceSPerKm !== null) {
    const avg =
      similarRuns.reduce((sum, run) => sum + (run.avgPaceSPerKm as number), 0) / similarRuns.length;
    const delta = current.avgPaceSPerKm - avg;
    similar = {
      count: similarRuns.length,
      avgPaceSPerKm: avg,
      paceDeltaSPerKm: delta,
      trend: trendOf(delta),
    };
  }

  const previousBestKm = earlier
    .map((run) => run.bestPaceSPerKm)
    .filter((pace): pace is number => pace !== null);

  return {
    previous: last
      ? {
          distanceDeltaM: current.distanceM - last.distanceM,
          paceDeltaSPerKm:
            current.avgPaceSPerKm !== null && last.avgPaceSPerKm !== null
              ? current.avgPaceSPerKm - last.avgPaceSPerKm
              : null,
        }
      : null,
    similar,
    records: {
      longestRun: earlier.length > 0 && earlier.every((run) => current.distanceM > run.distanceM),
      fastestKm:
        current.bestPaceSPerKm !== null &&
        previousBestKm.length > 0 &&
        previousBestKm.every((pace) => current.bestPaceSPerKm! < pace),
      fastestPaceForDistance:
        current.avgPaceSPerKm !== null &&
        similarRuns.length >= 2 &&
        similarRuns.every((run) => current.avgPaceSPerKm! < (run.avgPaceSPerKm as number)),
    },
    isFirstRun: earlier.length === 0,
  };
}
