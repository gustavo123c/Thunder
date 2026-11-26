/**
 * Personal records, achievements and goal progress for the profile screen.
 * Pure functions over the same activity entries used by the streak/dashboard.
 */
import type { RunnerGoal } from '../types/profile';
import { type ActivityEntry, startOfWeek } from './activity';

export type RecordEntry = ActivityEntry & { id: string };

/** Shortest distance that counts for "best pace" (avoids 200 m sprints). */
export const BEST_PACE_MIN_DISTANCE_M = 1000;
export const FIVE_K_M = 5000;

export type PersonalRecords = {
  bestPace: { runId: string; startedAt: string; paceSPerKm: number } | null;
  longestRun: { runId: string; startedAt: string; distanceM: number } | null;
  /** Fastest run of at least 5 km, projected to 5 km at its average pace. */
  best5k: { runId: string; startedAt: string; timeS: number } | null;
};

function paceOf(entry: ActivityEntry): number | null {
  return entry.distanceM > 0 && entry.movingTimeS > 0
    ? entry.movingTimeS / (entry.distanceM / 1000)
    : null;
}

export function computePersonalRecords(entries: readonly RecordEntry[]): PersonalRecords {
  let bestPace: PersonalRecords['bestPace'] = null;
  let longestRun: PersonalRecords['longestRun'] = null;
  let best5k: PersonalRecords['best5k'] = null;

  for (const entry of entries) {
    const pace = paceOf(entry);
    if (entry.distanceM > 0 && (!longestRun || entry.distanceM > longestRun.distanceM)) {
      longestRun = { runId: entry.id, startedAt: entry.startedAt, distanceM: entry.distanceM };
    }
    if (pace === null) continue;
    if (entry.distanceM >= BEST_PACE_MIN_DISTANCE_M && (!bestPace || pace < bestPace.paceSPerKm)) {
      bestPace = { runId: entry.id, startedAt: entry.startedAt, paceSPerKm: pace };
    }
    const fiveKTime = pace * (FIVE_K_M / 1000);
    if (entry.distanceM >= FIVE_K_M && (!best5k || fiveKTime < best5k.timeS)) {
      best5k = { runId: entry.id, startedAt: entry.startedAt, timeS: fiveKTime };
    }
  }

  return { bestPace, longestRun, best5k };
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Longest run of consecutive active weeks (Monday-based, local time). */
export function longestWeekStreak(entries: readonly ActivityEntry[]): number {
  const weeks = [...new Set(entries.map((e) => startOfWeek(new Date(e.startedAt)).getTime()))].sort(
    (a, b) => a - b,
  );
  let best = 0;
  let current = 0;
  let previous: number | null = null;
  for (const week of weeks) {
    // DST shifts week starts by ±1h, so compare rounded week counts.
    current = previous !== null && Math.round((week - previous) / WEEK_MS) === 1 ? current + 1 : 1;
    best = Math.max(best, current);
    previous = week;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

export type AchievementId =
  | 'first_run'
  | 'runs_10'
  | 'first_5k'
  | 'first_10k'
  | 'streak_3'
  | 'streak_8'
  | 'km_50'
  | 'km_100'
  | 'km_250';

export type AchievementInput = {
  totalRuns: number;
  totalDistanceM: number;
  longestRunM: number;
  longestWeekStreak: number;
};

export type Achievement = {
  id: AchievementId;
  current: number;
  target: number;
  unlocked: boolean;
  /** 0..1 */
  progress: number;
};

const ACHIEVEMENT_RULES: readonly {
  id: AchievementId;
  target: number;
  value: (input: AchievementInput) => number;
}[] = [
  { id: 'first_run', target: 1, value: (i) => i.totalRuns },
  { id: 'first_5k', target: 5000, value: (i) => i.longestRunM },
  { id: 'streak_3', target: 3, value: (i) => i.longestWeekStreak },
  { id: 'runs_10', target: 10, value: (i) => i.totalRuns },
  { id: 'km_50', target: 50_000, value: (i) => i.totalDistanceM },
  { id: 'first_10k', target: 10_000, value: (i) => i.longestRunM },
  { id: 'streak_8', target: 8, value: (i) => i.longestWeekStreak },
  { id: 'km_100', target: 100_000, value: (i) => i.totalDistanceM },
  { id: 'km_250', target: 250_000, value: (i) => i.totalDistanceM },
];

export function computeAchievements(input: AchievementInput): Achievement[] {
  return ACHIEVEMENT_RULES.map(({ id, target, value }) => {
    const current = Math.max(0, value(input));
    return {
      id,
      current,
      target,
      unlocked: current >= target,
      progress: clamp01(current / target),
    };
  });
}

// ---------------------------------------------------------------------------
// Main goal progress
// ---------------------------------------------------------------------------

export type GoalProgressInput = {
  longestRunM: number;
  longestMovingTimeS: number;
  recentPaceSPerKm: number | null;
  targetPaceSPerKm: number | null;
  runsThisMonth: number;
};

export type GoalProgress = {
  /** 0..1 */
  progress: number;
  current: number | null;
  target: number;
  unit: 'm' | 's' | 's_per_km' | 'runs';
};

/** Monthly run target for weight loss (≈ 3 runs a week). */
export const WEIGHT_LOSS_RUNS_PER_MONTH = 12;
export const ENDURANCE_TARGET_S = 60 * 60;

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

/** Null when the goal has no measurable target (e.g. pace goal without a target pace). */
export function goalProgress(goal: RunnerGoal, input: GoalProgressInput): GoalProgress | null {
  switch (goal) {
    case 'complete_5k':
    case 'complete_10k': {
      const target = goal === 'complete_5k' ? 5000 : 10_000;
      return {
        progress: clamp01(input.longestRunM / target),
        current: input.longestRunM,
        target,
        unit: 'm',
      };
    }
    case 'improve_pace': {
      if (!input.targetPaceSPerKm) return null;
      const current = input.recentPaceSPerKm;
      return {
        // Lower is better: at the target (or faster) → 100%.
        progress: current ? clamp01(input.targetPaceSPerKm / current) : 0,
        current,
        target: input.targetPaceSPerKm,
        unit: 's_per_km',
      };
    }
    case 'increase_endurance':
      return {
        progress: clamp01(input.longestMovingTimeS / ENDURANCE_TARGET_S),
        current: input.longestMovingTimeS,
        target: ENDURANCE_TARGET_S,
        unit: 's',
      };
    case 'lose_weight':
      return {
        progress: clamp01(input.runsThisMonth / WEIGHT_LOSS_RUNS_PER_MONTH),
        current: input.runsThisMonth,
        target: WEIGHT_LOSS_RUNS_PER_MONTH,
        unit: 'runs',
      };
  }
}

/** Longest distance (m) and longest moving time (s) among the entries. */
export function longestEfforts(entries: readonly ActivityEntry[]): {
  longestRunM: number;
  longestMovingTimeS: number;
} {
  return entries.reduce(
    (acc, e) => ({
      longestRunM: Math.max(acc.longestRunM, e.distanceM),
      longestMovingTimeS: Math.max(acc.longestMovingTimeS, e.movingTimeS),
    }),
    { longestRunM: 0, longestMovingTimeS: 0 },
  );
}
