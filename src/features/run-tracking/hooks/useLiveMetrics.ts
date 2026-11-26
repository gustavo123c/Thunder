import { useEffect, useMemo, useState } from 'react';

import { estimateCaloriesKcal } from '@/domain/metrics/calories';
import { buildIntervals, movingTimeS, totalDistanceM } from '@/domain/metrics/intervals';
import { currentPaceSPerKm, paceSPerKm } from '@/domain/metrics/pace';
import { computeSplits } from '@/domain/metrics/splits';
import { activeTimeS } from '@/domain/metrics/session-time';

import { useRunSessionStore } from '../store/run-session.store';

export type LiveMetrics = {
  distanceM: number;
  activeTimeS: number;
  currentPaceSPerKm: number | null;
  avgPaceSPerKm: number | null;
  caloriesKcal: number | null;
  /** Completed kilometers ("voltas"), oldest first, as pace in s/km. */
  lapPacesSPerKm: number[];
};

/** Re-renders once per second while running so the timer advances between GPS fixes. */
function useClock(enabled: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const tick = () => setNow(Date.now());
    const immediate = setTimeout(tick, 0); // refresh right away after resume
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(immediate);
      clearInterval(id);
    };
  }, [enabled]);
  return now;
}

export function useLiveMetrics(weightKg: number | null): LiveMetrics {
  const run = useRunSessionStore((state) => state.run);
  const samples = useRunSessionStore((state) => state.samples);
  const now = useClock(run?.session.status === 'running');

  // Track-derived metrics only change when a new fix arrives, not every tick.
  const trackMetrics = useMemo(() => {
    const intervals = buildIntervals(samples);
    const distanceM = totalDistanceM(intervals);
    return {
      distanceM,
      currentPaceSPerKm: currentPaceSPerKm(intervals),
      avgPaceSPerKm: paceSPerKm(distanceM, movingTimeS(intervals)),
      caloriesKcal: estimateCaloriesKcal(intervals, weightKg),
      lapPacesSPerKm: computeSplits(intervals)
        .filter((split) => split.distanceM >= 999)
        .map((split) => split.paceSPerKm),
    };
  }, [samples, weightKg]);

  const isPaused = run?.session.status === 'paused';

  return {
    ...trackMetrics,
    currentPaceSPerKm: isPaused ? null : trackMetrics.currentPaceSPerKm,
    activeTimeS: run ? activeTimeS(run.session.periods, now) : 0,
  };
}
