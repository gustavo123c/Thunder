/**
 * What to celebrate right after a run: medals it unlocked and motivating comparisons
 * ("8% mais rápido que a média da semana", "faltam 2 km para a medalha de 10 km").
 * Returns data only; the wording lives in features/progress.
 */
import { type ActivityEntry, periodRange } from './activity';
import {
  type Achievement,
  type AchievementId,
  achievementInput,
  BEST_PACE_MIN_DISTANCE_M,
  computeAchievements,
  type RecordEntry,
} from './records';

export type Highlight =
  | { kind: 'pace_vs_week'; percentFaster: number }
  | { kind: 'longest_run' }
  | { kind: 'best_pace' }
  | { kind: 'next_medal'; achievement: Achievement; remaining: number };

function paceOf(e: ActivityEntry): number | null {
  return e.distanceM >= BEST_PACE_MIN_DISTANCE_M && e.movingTimeS > 0
    ? e.movingTimeS / (e.distanceM / 1000)
    : null;
}

/** Medals unlocked by this run (unlocked with it, locked without it). */
export function medalsUnlockedBy(
  entries: readonly RecordEntry[],
  runId: string,
  allTime?: { runs: number; distanceM: number },
): AchievementId[] {
  const run = entries.find((e) => e.id === runId);
  if (!run) return [];
  const others = entries.filter((e) => e.id !== runId);
  // All-time totals already include this run; subtract it for the "before" picture.
  const before = computeAchievements(
    achievementInput(
      others,
      allTime && {
        runs: Math.max(0, allTime.runs - 1),
        distanceM: Math.max(0, allTime.distanceM - run.distanceM),
      },
    ),
  );
  const after = computeAchievements(achievementInput(entries, allTime));
  const wasUnlocked = new Set(before.filter((a) => a.unlocked).map((a) => a.id));
  return after.filter((a) => a.unlocked && !wasUnlocked.has(a.id)).map((a) => a.id);
}

/** Up to `limit` highlights for the run, most motivating first. */
export function celebrationHighlights(
  entries: readonly RecordEntry[],
  runId: string,
  now: Date,
  allTime?: { runs: number; distanceM: number },
  limit = 2,
): Highlight[] {
  const run = entries.find((e) => e.id === runId);
  if (!run) return [];
  const others = entries.filter((e) => e.id !== runId);
  const highlights: Highlight[] = [];

  const pace = paceOf(run);
  const previousPaces = others.map(paceOf).filter((p): p is number => p !== null);

  // Personal records (only meaningful with some history).
  if (others.length > 0 && run.distanceM > Math.max(...others.map((e) => e.distanceM))) {
    highlights.push({ kind: 'longest_run' });
  }
  if (pace !== null && previousPaces.length > 0 && pace < Math.min(...previousPaces)) {
    highlights.push({ kind: 'best_pace' });
  }

  // Pace vs the other runs of this week (distance-weighted).
  const week = periodRange('week', now);
  const weekRuns = others.filter((e) => {
    const t = new Date(e.startedAt).getTime();
    return t >= week.start.getTime() && t < week.end.getTime() && paceOf(e) !== null;
  });
  if (pace !== null && weekRuns.length > 0) {
    const distance = weekRuns.reduce((sum, e) => sum + e.distanceM, 0);
    const time = weekRuns.reduce((sum, e) => sum + e.movingTimeS, 0);
    const weekPace = time / (distance / 1000);
    const percentFaster = Math.round(((weekPace - pace) / weekPace) * 100);
    if (percentFaster >= 1) highlights.push({ kind: 'pace_vs_week', percentFaster });
  }

  // The locked medal closest to being unlocked (at least halfway there).
  const next = computeAchievements(achievementInput(entries, allTime))
    .filter((a) => !a.unlocked && a.progress >= 0.5)
    .sort((a, b) => b.progress - a.progress)[0];
  if (next)
    highlights.push({
      kind: 'next_medal',
      achievement: next,
      remaining: next.target - next.current,
    });

  return highlights.slice(0, limit);
}
