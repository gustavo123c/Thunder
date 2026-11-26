import { celebrationHighlights, medalsUnlockedBy } from '../celebration';
import type { RecordEntry } from '../records';

const now = new Date(2026, 10, 27, 19); // Friday
const at = (day: number, hour = 7) => new Date(2026, 10, day, hour).toISOString();
const run = (id: string, startedAt: string, km: number, paceS: number): RecordEntry => ({
  id,
  startedAt,
  distanceM: km * 1000,
  movingTimeS: km * paceS,
});

describe('medalsUnlockedBy', () => {
  it('lists medals the run unlocked', () => {
    expect(medalsUnlockedBy([run('a', at(27), 5, 360)], 'a')).toEqual(['first_run', 'first_5k']);
  });

  it('ignores medals that were already unlocked', () => {
    const entries = [run('old', at(20), 6, 360), run('new', at(27), 5.5, 360)];
    expect(medalsUnlockedBy(entries, 'new')).toEqual([]);
  });

  it('uses all-time totals for cumulative medals', () => {
    const entries = [run('new', at(27), 3, 360)];
    // 48 km before + 3 km now = 51 km → 50 km medal.
    expect(medalsUnlockedBy(entries, 'new', { runs: 9, distanceM: 51_000 })).toEqual(
      expect.arrayContaining(['km_50']),
    );
  });

  it('is empty for an unknown run', () => {
    expect(medalsUnlockedBy([], 'x')).toEqual([]);
  });
});

describe('celebrationHighlights', () => {
  it('compares the pace with the rest of the week', () => {
    const entries = [
      run('mon', at(23), 5, 360),
      run('wed', at(25), 5, 360),
      run('fri', at(27), 4, 330), // 8% faster than 6:00
    ];
    expect(celebrationHighlights(entries, 'fri', now, undefined, 5)).toContainEqual({
      kind: 'pace_vs_week',
      percentFaster: 8,
    });
  });

  it('celebrates records', () => {
    const entries = [run('a', at(10), 5, 360), run('b', at(27), 8, 340)];
    const kinds = celebrationHighlights(entries, 'b', now, undefined, 5).map((h) => h.kind);
    expect(kinds).toEqual(expect.arrayContaining(['longest_run', 'best_pace']));
  });

  it('points to the next medal when it is close', () => {
    const entries = [run('a', at(27), 8, 360)];
    const next = celebrationHighlights(entries, 'a', now, undefined, 5).find(
      (h) => h.kind === 'next_medal',
    );
    expect(next).toMatchObject({ achievement: { id: 'first_10k' }, remaining: 2000 });
  });

  it('limits the number of highlights', () => {
    const entries = [run('a', at(10), 5, 360), run('b', at(27), 8, 340)];
    expect(celebrationHighlights(entries, 'b', now)).toHaveLength(2);
  });
});

describe('runs without recorded distance', () => {
  it('unlock no medals and get no highlights', () => {
    const entries = [run('gps-off', at(27), 0, 0)];
    expect(medalsUnlockedBy(entries, 'gps-off')).toEqual([]);
    expect(celebrationHighlights(entries, 'gps-off', now)).toEqual([]);
  });
});
