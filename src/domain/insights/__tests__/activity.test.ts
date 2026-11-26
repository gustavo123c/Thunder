import {
  type ActivityEntry,
  activityWindowStart,
  comparePeriods,
  computeWinStreak,
  periodRange,
} from '../activity';

// Wednesday 25 Nov 2026, 18:00 local time
const NOW = new Date(2026, 10, 25, 18, 0);

function run(y: number, m: number, d: number, h = 7, km = 5, paceS = 360): ActivityEntry {
  return {
    startedAt: new Date(y, m, d, h, 0).toISOString(),
    distanceM: km * 1000,
    movingTimeS: km * paceS,
  };
}

describe('periodRange', () => {
  it('uses Monday-based weeks in local time', () => {
    const { start, end } = periodRange('week', NOW);
    expect(start).toEqual(new Date(2026, 10, 23));
    expect(end).toEqual(new Date(2026, 10, 30));
  });

  it('returns previous periods with an offset', () => {
    expect(periodRange('month', NOW, -1).start).toEqual(new Date(2026, 9, 1));
    expect(periodRange('year', NOW, -1)).toEqual({
      start: new Date(2025, 0, 1),
      end: new Date(2026, 0, 1),
    });
    expect(periodRange('day', NOW, -1).start).toEqual(new Date(2026, 10, 24));
  });

  it('starts the data window at the previous year', () => {
    expect(activityWindowStart(NOW)).toEqual(new Date(2025, 0, 1));
  });
});

describe('computeWinStreak', () => {
  it('counts runs and active days this week and month', () => {
    const streak = computeWinStreak(
      [
        run(2026, 10, 23), // Mon
        run(2026, 10, 23, 19), // Mon again → same active day
        run(2026, 10, 25), // Wed
        run(2026, 10, 10), // earlier this month
        run(2026, 9, 30), // last month
      ],
      NOW,
    );
    expect(streak).toMatchObject({
      runsThisWeek: 3,
      activeDaysThisWeek: 2,
      runsThisMonth: 4,
      activeDaysThisMonth: 3,
    });
  });

  it('counts a late-evening run on its local day', () => {
    const streak = computeWinStreak([run(2026, 10, 22, 23)], NOW); // Sunday 23h
    expect(streak.runsThisWeek).toBe(0);
  });

  it('counts consecutive active weeks, keeping the streak alive until a full week is missed', () => {
    const entries = [run(2026, 10, 18), run(2026, 10, 11), run(2026, 10, 4), run(2026, 9, 20)];
    // This week has no run yet: streak counts the 3 previous consecutive weeks.
    expect(computeWinStreak(entries, NOW).weekStreak).toBe(3);
    // A run this week extends it.
    expect(computeWinStreak([...entries, run(2026, 10, 24)], NOW).weekStreak).toBe(4);
  });

  it('is zero without recent runs', () => {
    expect(computeWinStreak([run(2026, 9, 1)], NOW)).toEqual({
      runsThisWeek: 0,
      runsThisMonth: 0,
      activeDaysThisWeek: 0,
      activeDaysThisMonth: 0,
      weekStreak: 0,
    });
  });
});

describe('comparePeriods', () => {
  it('reports pace improvement as a positive percentage', () => {
    const result = comparePeriods(
      [
        run(2026, 10, 17, 7, 5, 400), // last week: 6:40 /km
        run(2026, 10, 24, 7, 5, 360), // this week: 6:00 /km
      ],
      'week',
      NOW,
    );
    expect(result.current.avgPaceSPerKm).toBe(360);
    expect(result.previous.avgPaceSPerKm).toBe(400);
    expect(result.paceImprovementPct).toBe(10);
    expect(result.distanceChangePct).toBe(0);
    expect(result.runsChange).toBe(0);
  });

  it('weights pace by distance', () => {
    const result = comparePeriods(
      [run(2026, 10, 24, 7, 10, 300), run(2026, 10, 25, 7, 2, 420)],
      'week',
      NOW,
    );
    // (3000 + 840) s / 12 km = 320 s/km
    expect(result.current.avgPaceSPerKm).toBe(320);
  });

  it('reports a slower period as a negative percentage', () => {
    const result = comparePeriods(
      [run(2026, 9, 10, 7, 5, 360), run(2026, 10, 10, 7, 5, 396)],
      'month',
      NOW,
    );
    expect(result.paceImprovementPct).toBe(-10);
  });

  it('returns null percentages when there is nothing to compare', () => {
    const result = comparePeriods([run(2026, 10, 25)], 'day', NOW);
    expect(result.paceImprovementPct).toBeNull();
    expect(result.distanceChangePct).toBeNull();
    expect(result.runsChange).toBe(1);
  });

  it('compares distance across years', () => {
    const result = comparePeriods(
      [run(2025, 5, 1, 7, 10), run(2026, 5, 1, 7, 10), run(2026, 6, 1, 7, 5)],
      'year',
      NOW,
    );
    expect(result.distanceChangePct).toBe(50);
  });
});
