import { groupRunsByMonth } from '../group-by-month';

const run = (id: string, date: Date, km: number) => ({
  id,
  startedAt: date.toISOString(),
  distanceM: km * 1000,
});

describe('groupRunsByMonth', () => {
  it('groups consecutive runs by local month with totals', () => {
    const sections = groupRunsByMonth([
      run('a', new Date(2026, 10, 20, 7), 5),
      run('b', new Date(2026, 10, 2, 7), 3),
      run('c', new Date(2026, 9, 30, 22), 10),
    ]);
    expect(sections.map((s) => [s.title, s.data.length, s.totalDistanceM])).toEqual([
      ['Novembro de 2026', 2, 8000],
      ['Outubro de 2026', 1, 10_000],
    ]);
  });

  it('returns no sections without runs', () => {
    expect(groupRunsByMonth([])).toEqual([]);
  });
});
