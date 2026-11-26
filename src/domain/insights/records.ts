/**
 * Personal records, achievements and goal progress for the profile screen.
 * Pure functions over the same activity entries used by the streak/dashboard.
 */
import { hasRecordedDistance } from '../metrics/recorded-distance';
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

export const ACHIEVEMENT_IDS = [
  'first_run',
  'first_5k',
  'first_10k',
  'half_marathon',
  'days_7',
  'month_12',
  'streak_3',
  'streak_8',
  'runs_10',
  'km_50',
  'km_100',
  'km_250',
] as const;
export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

export type AchievementInput = {
  totalRuns: number;
  totalDistanceM: number;
  longestRunM: number;
  longestWeekStreak: number;
  /** Most consecutive calendar days with a run. */
  longestDayStreak: number;
  /** Most runs in a single calendar month. */
  bestMonthRuns: number;
};

/** How the medal is measured, for "Faltam …" messages. */
export type AchievementUnit =
  'runs' | 'meters_single' | 'meters_total' | 'weeks' | 'days' | 'month_runs';

export type Achievement = {
  id: AchievementId;
  unit: AchievementUnit;
  current: number;
  target: number;
  unlocked: boolean;
  /** 0..1 */
  progress: number;
};

export const HALF_MARATHON_M = 21_097;

const ACHIEVEMENT_RULES: Record<
  AchievementId,
  { target: number; unit: AchievementUnit; value: (input: AchievementInput) => number }
> = {
  first_run: { target: 1, unit: 'runs', value: (i) => i.totalRuns },
  first_5k: { target: 5000, unit: 'meters_single', value: (i) => i.longestRunM },
  first_10k: { target: 10_000, unit: 'meters_single', value: (i) => i.longestRunM },
  half_marathon: { target: HALF_MARATHON_M, unit: 'meters_single', value: (i) => i.longestRunM },
  days_7: { target: 7, unit: 'days', value: (i) => i.longestDayStreak },
  month_12: { target: 12, unit: 'month_runs', value: (i) => i.bestMonthRuns },
  streak_3: { target: 3, unit: 'weeks', value: (i) => i.longestWeekStreak },
  streak_8: { target: 8, unit: 'weeks', value: (i) => i.longestWeekStreak },
  runs_10: { target: 10, unit: 'runs', value: (i) => i.totalRuns },
  km_50: { target: 50_000, unit: 'meters_total', value: (i) => i.totalDistanceM },
  km_100: { target: 100_000, unit: 'meters_total', value: (i) => i.totalDistanceM },
  km_250: { target: 250_000, unit: 'meters_total', value: (i) => i.totalDistanceM },
};

const DAY_MS = 24 * 60 * 60 * 1000;

function localDayNumber(iso: string): number {
  const d = new Date(iso);
  // Days since epoch in local time (DST-safe: built from the local calendar date).
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
}

/** Most consecutive local calendar days with at least one run. */
export function longestDayStreak(entries: readonly ActivityEntry[]): number {
  const days = [...new Set(entries.map((e) => localDayNumber(e.startedAt)))].sort((a, b) => a - b);
  let best = 0;
  let current = 0;
  days.forEach((day, i) => {
    current = i > 0 && day - days[i - 1]! === 1 ? current + 1 : 1;
    best = Math.max(best, current);
  });
  return best;
}

/** Most runs in one local calendar month. */
export function bestMonthRuns(entries: readonly ActivityEntry[]): number {
  const counts = new Map<string, number>();
  for (const e of entries) {
    const d = new Date(e.startedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Math.max(0, ...counts.values());
}

/**
 * Medal inputs from the activity window. `allTime` (profile stats) replaces the window's
 * run count and distance when larger, since the window only covers recent years.
 */
export function achievementInput(
  allEntries: readonly ActivityEntry[],
  allTime?: { runs: number; distanceM: number },
): AchievementInput {
  // Runs where the GPS recorded nothing don't count for medals.
  const entries = allEntries.filter((e) => hasRecordedDistance(e.distanceM));
  const windowDistance = entries.reduce((sum, e) => sum + e.distanceM, 0);
  return {
    totalRuns: Math.max(entries.length, allTime?.runs ?? 0),
    totalDistanceM: Math.max(windowDistance, allTime?.distanceM ?? 0),
    longestRunM: longestEfforts(entries).longestRunM,
    longestWeekStreak: longestWeekStreak(entries),
    longestDayStreak: longestDayStreak(entries),
    bestMonthRuns: bestMonthRuns(entries),
  };
}

export function computeAchievements(input: AchievementInput): Achievement[] {
  return ACHIEVEMENT_IDS.map((id) => {
    const { target, unit, value } = ACHIEVEMENT_RULES[id];
    const current = Math.max(0, value(input));
    return {
      id,
      unit,
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
