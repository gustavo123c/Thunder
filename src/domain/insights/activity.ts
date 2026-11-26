/**
 * Activity statistics for the win streak and the progress dashboard.
 * All calendar math uses the device's local time (a 22h run counts for that day,
 * not the next UTC day). Weeks start on Monday.
 */

export type ActivityEntry = {
  startedAt: string; // ISO
  distanceM: number;
  movingTimeS: number;
};

export type Period = 'day' | 'week' | 'month' | 'year';

export type PeriodRange = { start: Date; end: Date }; // [start, end)

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
  return d;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

function shift(date: Date, period: Period, amount: number): Date {
  const d = new Date(date);
  if (period === 'day') d.setDate(d.getDate() + amount);
  else if (period === 'week') d.setDate(d.getDate() + amount * 7);
  else if (period === 'month') d.setMonth(d.getMonth() + amount);
  else d.setFullYear(d.getFullYear() + amount);
  return d;
}

const PERIOD_START: Record<Period, (date: Date) => Date> = {
  day: startOfDay,
  week: startOfWeek,
  month: startOfMonth,
  year: startOfYear,
};

/** The period containing `now`, or `offset` periods before it (offset = -1 → previous). */
export function periodRange(period: Period, now: Date, offset = 0): PeriodRange {
  const start = shift(PERIOD_START[period](now), period, offset);
  return { start, end: shift(start, period, 1) };
}

function inRange(entry: ActivityEntry, range: PeriodRange): boolean {
  const t = new Date(entry.startedAt).getTime();
  return t >= range.start.getTime() && t < range.end.getTime();
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// ---------------------------------------------------------------------------
// Win streak
// ---------------------------------------------------------------------------

export type WinStreak = {
  runsThisWeek: number;
  runsThisMonth: number;
  activeDaysThisWeek: number;
  activeDaysThisMonth: number;
  /** Consecutive weeks with at least one run, ending this week (or last week, if
   *  this week has no run yet — the streak is only lost once a full week is missed). */
  weekStreak: number;
};

export function computeWinStreak(entries: readonly ActivityEntry[], now: Date): WinStreak {
  const week = periodRange('week', now);
  const month = periodRange('month', now);

  const thisWeek = entries.filter((e) => inRange(e, week));
  const thisMonth = entries.filter((e) => inRange(e, month));
  const distinctDays = (list: readonly ActivityEntry[]) =>
    new Set(list.map((e) => dayKey(new Date(e.startedAt)))).size;

  const activeWeeks = new Set(entries.map((e) => startOfWeek(new Date(e.startedAt)).getTime()));
  let cursor = week.start;
  if (!activeWeeks.has(cursor.getTime())) cursor = shift(cursor, 'week', -1);
  let weekStreak = 0;
  while (activeWeeks.has(cursor.getTime())) {
    weekStreak += 1;
    cursor = shift(cursor, 'week', -1);
  }

  return {
    runsThisWeek: thisWeek.length,
    runsThisMonth: thisMonth.length,
    activeDaysThisWeek: distinctDays(thisWeek),
    activeDaysThisMonth: distinctDays(thisMonth),
    weekStreak,
  };
}

// ---------------------------------------------------------------------------
// Period comparison (dashboard)
// ---------------------------------------------------------------------------

export type PeriodTotals = {
  runs: number;
  distanceM: number;
  movingTimeS: number;
  /** Distance-weighted average pace (total time / total distance); null without distance. */
  avgPaceSPerKm: number | null;
};

export type PeriodComparison = {
  period: Period;
  current: PeriodTotals;
  previous: PeriodTotals;
  /** Positive = faster than the previous period. Null when either has no pace. */
  paceImprovementPct: number | null;
  /** Positive = more distance. Null when the previous period had none. */
  distanceChangePct: number | null;
  runsChange: number;
};

const MIN_DISTANCE_FOR_PACE_M = 200;

function totals(entries: readonly ActivityEntry[]): PeriodTotals {
  const distanceM = entries.reduce((sum, e) => sum + e.distanceM, 0);
  const movingTimeS = entries.reduce((sum, e) => sum + e.movingTimeS, 0);
  return {
    runs: entries.length,
    distanceM,
    movingTimeS,
    avgPaceSPerKm:
      distanceM >= MIN_DISTANCE_FOR_PACE_M && movingTimeS > 0
        ? movingTimeS / (distanceM / 1000)
        : null,
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function comparePeriods(
  entries: readonly ActivityEntry[],
  period: Period,
  now: Date,
): PeriodComparison {
  const current = totals(entries.filter((e) => inRange(e, periodRange(period, now))));
  const previous = totals(entries.filter((e) => inRange(e, periodRange(period, now, -1))));

  return {
    period,
    current,
    previous,
    paceImprovementPct:
      current.avgPaceSPerKm !== null && previous.avgPaceSPerKm !== null
        ? round1(((previous.avgPaceSPerKm - current.avgPaceSPerKm) / previous.avgPaceSPerKm) * 100)
        : null,
    distanceChangePct:
      previous.distanceM > 0
        ? round1(((current.distanceM - previous.distanceM) / previous.distanceM) * 100)
        : null,
    runsChange: current.runs - previous.runs,
  };
}

/** Earliest date the dashboard needs (start of the previous year). */
export function activityWindowStart(now: Date): Date {
  return periodRange('year', now, -1).start;
}

/**
 * Distance-weighted average pace of the most recent `count` runs (s/km), used to
 * set target paces for generated workouts. Null without enough data.
 */
export function recentAveragePace(entries: readonly ActivityEntry[], count = 5): number | null {
  const recent = [...entries]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, count);
  return totals(recent).avgPaceSPerKm;
}
