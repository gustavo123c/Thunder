import {
  achievementInput,
  bestMonthRuns,
  computeAchievements,
  longestDayStreak,
  computePersonalRecords,
  goalProgress,
  longestEfforts,
  longestWeekStreak,
  type RecordEntry,
} from '../records';

const run = (id: string, date: Date, km: number, paceS: number): RecordEntry => ({
  id,
  startedAt: date.toISOString(),
  distanceM: km * 1000,
  movingTimeS: km * paceS,
});

describe('computePersonalRecords', () => {
  it('finds best pace, longest run and best 5K', () => {
    const records = computePersonalRecords([
      run('a', new Date(2026, 0, 5), 0.5, 200), // too short for best pace
      run('b', new Date(2026, 0, 6), 3, 300),
      run('c', new Date(2026, 0, 7), 10, 330),
      run('d', new Date(2026, 0, 8), 5, 320),
    ]);
    expect(records.bestPace).toMatchObject({ runId: 'b', paceSPerKm: 300 });
    expect(records.longestRun).toMatchObject({ runId: 'c', distanceM: 10_000 });
    expect(records.best5k).toMatchObject({ runId: 'd', timeS: 1600 });
  });

  it('is empty without runs', () => {
    expect(computePersonalRecords([])).toEqual({ bestPace: null, longestRun: null, best5k: null });
  });
});

describe('longestWeekStreak', () => {
  it('counts the longest run of consecutive weeks', () => {
    const entries = [
      new Date(2026, 0, 5), // week 1
      new Date(2026, 0, 13), // week 2
      new Date(2026, 1, 2), // gap, then 3 weeks in a row
      new Date(2026, 1, 10),
      new Date(2026, 1, 11),
      new Date(2026, 1, 16),
    ].map((d, i) => run(String(i), d, 5, 360));
    expect(longestWeekStreak(entries)).toBe(3);
    expect(longestWeekStreak([])).toBe(0);
  });

  it('survives daylight-saving changes', () => {
    // Weeks around the October DST change in many time zones.
    const entries = [new Date(2026, 9, 19), new Date(2026, 9, 26), new Date(2026, 10, 2)].map(
      (d, i) => run(String(i), d, 5, 360),
    );
    expect(longestWeekStreak(entries)).toBe(3);
  });
});

describe('computeAchievements', () => {
  const input = {
    totalRuns: 4,
    totalDistanceM: 25_000,
    longestRunM: 6000,
    longestWeekStreak: 3,
    longestDayStreak: 2,
    bestMonthRuns: 4,
  };

  it('unlocks and reports progress', () => {
    const byId = Object.fromEntries(computeAchievements(input).map((a) => [a.id, a]));
    expect(byId.first_run?.unlocked).toBe(true);
    expect(byId.first_5k?.unlocked).toBe(true);
    expect(byId.streak_3?.unlocked).toBe(true);
    expect(byId.first_10k).toMatchObject({ unlocked: false, progress: 0.6 });
    expect(byId.km_50).toMatchObject({ unlocked: false, progress: 0.5 });
  });

  it('includes the half marathon, 7-day and 12-runs-a-month medals', () => {
    const byId = Object.fromEntries(
      computeAchievements({
        ...input,
        longestRunM: 21_100,
        longestDayStreak: 7,
        bestMonthRuns: 12,
      }).map((a) => [a.id, a]),
    );
    expect(byId.half_marathon?.unlocked).toBe(true);
    expect(byId.days_7?.unlocked).toBe(true);
    expect(byId.month_12?.unlocked).toBe(true);
    expect(computeAchievements(input)).toHaveLength(12);
  });
});

describe('consistency helpers', () => {
  it('counts consecutive days and the best month', () => {
    const entries = [
      new Date(2026, 0, 30, 7),
      new Date(2026, 0, 31, 7),
      new Date(2026, 1, 1, 7), // crosses the month boundary
      new Date(2026, 1, 1, 18), // same day twice
      new Date(2026, 1, 3, 7),
    ].map((d, i) => run(String(i), d, 5, 360));
    expect(longestDayStreak(entries)).toBe(3);
    expect(bestMonthRuns(entries)).toBe(3);
    expect(longestDayStreak([])).toBe(0);
    expect(bestMonthRuns([])).toBe(0);
  });

  it('builds the medal input, preferring larger all-time totals', () => {
    const entries = [run('a', new Date(2026, 0, 5), 5, 360)];
    expect(achievementInput(entries)).toMatchObject({ totalRuns: 1, totalDistanceM: 5000 });
    expect(achievementInput(entries, { runs: 40, distanceM: 200_000 })).toMatchObject({
      totalRuns: 40,
      totalDistanceM: 200_000,
      longestRunM: 5000,
    });
  });
});

describe('goalProgress', () => {
  const base = {
    longestRunM: 2500,
    longestMovingTimeS: 1800,
    recentPaceSPerKm: 360,
    targetPaceSPerKm: 330,
    runsThisMonth: 3,
  };

  it('tracks distance goals by the longest run', () => {
    expect(goalProgress('complete_5k', base)).toMatchObject({ progress: 0.5, target: 5000 });
    expect(goalProgress('complete_10k', { ...base, longestRunM: 12_000 })?.progress).toBe(1);
  });

  it('tracks pace goals against the target (lower is better)', () => {
    expect(goalProgress('improve_pace', base)?.progress).toBeCloseTo(330 / 360);
    expect(goalProgress('improve_pace', { ...base, recentPaceSPerKm: 300 })?.progress).toBe(1);
    expect(goalProgress('improve_pace', { ...base, targetPaceSPerKm: null })).toBeNull();
    expect(goalProgress('improve_pace', { ...base, recentPaceSPerKm: null })?.progress).toBe(0);
  });

  it('tracks endurance by time and weight loss by monthly runs', () => {
    expect(goalProgress('increase_endurance', base)?.progress).toBe(0.5);
    expect(goalProgress('lose_weight', base)?.progress).toBe(0.25);
  });
});

describe('longestEfforts', () => {
  it('returns the longest distance and moving time', () => {
    expect(longestEfforts([run('a', new Date(), 5, 300), run('b', new Date(), 3, 700)])).toEqual({
      longestRunM: 5000,
      longestMovingTimeS: 2100,
    });
  });
});
