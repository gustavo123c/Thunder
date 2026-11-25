import type { RunHistoryEntry } from '../../types/run';
import { compareWithHistory, currentWeekTotals } from '../comparison';

let n = 0;
function run(partial: Partial<RunHistoryEntry>): RunHistoryEntry {
  n += 1;
  return {
    id: `r${n}`,
    startedAt: '2026-11-20T09:00:00Z',
    distanceM: 5000,
    movingTimeS: 1800,
    avgPaceSPerKm: 360,
    bestPaceSPerKm: 340,
    ...partial,
  };
}

describe('compareWithHistory', () => {
  it('flags the first run', () => {
    const result = compareWithHistory(run({}), []);
    expect(result.isFirstRun).toBe(true);
    expect(result.previous).toBeNull();
    expect(result.similar).toBeNull();
    expect(result.records).toEqual({
      longestRun: false,
      fastestKm: false,
      fastestPaceForDistance: false,
    });
  });

  it('compares pace with similar-distance runs only', () => {
    const current = run({ distanceM: 5200, avgPaceSPerKm: 340 });
    const history = [
      run({ distanceM: 5000, avgPaceSPerKm: 350 }),
      run({ distanceM: 4800, avgPaceSPerKm: 360 }),
      run({ distanceM: 10_000, avgPaceSPerKm: 400 }), // not similar
      run({ distanceM: 5100, avgPaceSPerKm: null }), // no pace
    ];
    const { similar } = compareWithHistory(current, history);
    expect(similar).toEqual({
      count: 2,
      avgPaceSPerKm: 355,
      paceDeltaSPerKm: -15,
      trend: 'faster',
    });
  });

  it('treats tiny pace differences as the same pace', () => {
    const { similar } = compareWithHistory(run({ avgPaceSPerKm: 361 }), [
      run({ avgPaceSPerKm: 360 }),
    ]);
    expect(similar?.trend).toBe('same');
  });

  it('compares with the most recent run', () => {
    const { previous } = compareWithHistory(run({ distanceM: 6000, avgPaceSPerKm: 350 }), [
      run({ distanceM: 5000, avgPaceSPerKm: 360 }),
      run({ distanceM: 8000 }),
    ]);
    expect(previous).toEqual({ distanceDeltaM: 1000, paceDeltaSPerKm: -10 });
  });

  it('detects personal records', () => {
    const current = run({ distanceM: 12_000, avgPaceSPerKm: 300, bestPaceSPerKm: 280 });
    const history = [
      run({ distanceM: 11_000, avgPaceSPerKm: 320, bestPaceSPerKm: 290 }),
      run({ distanceM: 10_500, avgPaceSPerKm: 330, bestPaceSPerKm: 300 }),
    ];
    expect(compareWithHistory(current, history).records).toEqual({
      longestRun: true,
      fastestKm: true,
      fastestPaceForDistance: true,
    });
  });

  it('ignores the run itself if it appears in the history', () => {
    const current = run({ distanceM: 5000 });
    expect(compareWithHistory(current, [current]).isFirstRun).toBe(true);
  });
});

describe('currentWeekTotals', () => {
  it('sums runs since Monday 00:00 local time', () => {
    const wednesday = new Date(2026, 10, 25, 18, 0); // Wed 25 Nov 2026
    const totals = currentWeekTotals(
      [
        {
          startedAt: new Date(2026, 10, 23, 7, 0).toISOString(),
          distanceM: 5000,
          movingTimeS: 1800,
        },
        {
          startedAt: new Date(2026, 10, 25, 7, 0).toISOString(),
          distanceM: 3000,
          movingTimeS: 1000,
        },
        { startedAt: new Date(2026, 10, 22, 23, 0).toISOString(), distanceM: 9999, movingTimeS: 1 }, // Sunday
      ],
      wednesday,
    );
    expect(totals).toEqual({ runs: 2, distanceM: 8000, movingTimeS: 2800 });
  });
});
