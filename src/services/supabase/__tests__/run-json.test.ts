import { parseRunDetail, parseRunList, parseRunRecord, RunJsonError } from '../run-json';
// Real output of get_run_detail captured from Postgres (see supabase/tests).
import detailFixture from './fixtures/run-detail.json';

describe('parseRunDetail (contract with the database)', () => {
  it('parses the JSON produced by get_run_detail', () => {
    const detail = parseRunDetail(detailFixture);

    expect(detail.title).toBe('Corrida matinal');
    expect(detail.distanceM).toBe(3594.2);
    expect(detail.visibility).toBe('public');
    expect(detail.route).toEqual([
      [-46.63, -23.55],
      [-46.63, -23.54],
      [-46.62, -23.54],
    ]);
    expect(detail.author).toMatchObject({ username: 'ana.corre', fullName: 'Ana Souza' });
    expect(detail.hasKudo).toBe(false);
    expect(detail.splits.map((s) => s.index)).toEqual([0, 1]);
    expect(detail.splits[1]?.elevationDeltaM).toBeNull();
    expect(detail.previousRuns).toHaveLength(1);
    expect(detail.previousRuns[0]).toMatchObject({ distanceM: 5000, avgPaceSPerKm: 350 });
  });
});

describe('parseRunRecord', () => {
  const valid = { ...detailFixture };

  it('accepts numeric values encoded as strings', () => {
    expect(parseRunRecord({ ...valid, distance_m: '5000.50' }).distanceM).toBe(5000.5);
  });

  it('treats a null route as an empty track', () => {
    expect(parseRunRecord({ ...valid, route: null }).route).toEqual([]);
  });

  it('rejects malformed data loudly', () => {
    expect(() => parseRunRecord({ ...valid, distance_m: 'abc' })).toThrow(RunJsonError);
    expect(() => parseRunRecord({ ...valid, visibility: 'friends' })).toThrow('visibility');
    expect(() => parseRunRecord({ ...valid, route: { type: 'Point' } })).toThrow('route.type');
    expect(() => parseRunList({})).toThrow('runs');
  });
});
