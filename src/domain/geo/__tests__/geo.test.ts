import { METERS_PER_DEGREE_LAT, straightTrack, T0 } from '../../testing/track-builder';
import type { GpsSample } from '../../types/run';
import {
  applyGpsFilter,
  filterGpsSamples,
  type GpsFilterState,
  INITIAL_GPS_FILTER_STATE,
} from '../gps-filter';
import { haversineDistanceM } from '../haversine';
import { simplifyRoute } from '../simplify';

describe('haversineDistanceM', () => {
  it('is zero for the same point', () => {
    const p = { latitude: -23.55, longitude: -46.63 };
    expect(haversineDistanceM(p, p)).toBe(0);
  });

  it('matches one degree of latitude (~111.2 km)', () => {
    expect(
      haversineDistanceM({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 }),
    ).toBeCloseTo(METERS_PER_DEGREE_LAT, 3);
  });

  it('matches a known city distance (São Paulo → Rio ≈ 361 km)', () => {
    const saoPaulo = { latitude: -23.5505, longitude: -46.6333 };
    const rio = { latitude: -22.9068, longitude: -43.1729 };
    expect(haversineDistanceM(saoPaulo, rio) / 1000).toBeCloseTo(361, 0);
  });

  it('is symmetric', () => {
    const a = { latitude: 10, longitude: 20 };
    const b = { latitude: -5, longitude: 33 };
    expect(haversineDistanceM(a, b)).toBeCloseTo(haversineDistanceM(b, a), 6);
  });
});

function sample(overrides: Partial<GpsSample> & { t: number; northM?: number }): GpsSample {
  const { t, northM = 0, ...rest } = overrides;
  return {
    timestamp: T0 + t * 1000,
    latitude: -23.55 + northM / METERS_PER_DEGREE_LAT,
    longitude: -46.63,
    altitudeM: 760,
    accuracyM: 5,
    speedMps: null,
    segment: 0,
    ...rest,
  };
}

function run(samples: GpsSample[]) {
  let state: GpsFilterState = INITIAL_GPS_FILTER_STATE;
  return samples.map((s) => {
    const result = applyGpsFilter(state, s);
    state = result.state;
    return result.accepted ? 'ok' : result.reason;
  });
}

describe('applyGpsFilter', () => {
  it('keeps every fix of a clean running track', () => {
    const track = straightTrack({ speedMps: 4, durationS: 60 });
    expect(filterGpsSamples(track)).toHaveLength(track.length);
  });

  it('thins slow, dense tracks without losing distance (anchored to the last kept fix)', () => {
    const track = straightTrack({ speedMps: 1.2, durationS: 60 }); // walking, 1 Hz
    const kept = filterGpsSamples(track);
    expect(kept.length).toBeLessThan(track.length);
    expect(
      haversineDistanceM(kept[0] as GpsSample, kept[kept.length - 1] as GpsSample),
    ).toBeCloseTo(72, 0);
  });

  it('drops invalid, out-of-order and inaccurate fixes', () => {
    expect(
      run([
        sample({ t: 0 }),
        sample({ t: 1, latitude: Number.NaN }),
        sample({ t: -1, northM: 3 }),
        sample({ t: 2, northM: 6, accuracyM: 80 }),
        sample({ t: 3, northM: 9 }),
      ]),
    ).toEqual(['ok', 'invalid', 'out_of_order', 'low_accuracy', 'ok']);
  });

  it('accepts fixes without accuracy information (simulators)', () => {
    expect(run([sample({ t: 0, accuracyM: null }), sample({ t: 2, northM: 6 })])).toEqual([
      'ok',
      'ok',
    ]);
  });

  it('rejects a single GPS jump and keeps tracking after it', () => {
    expect(
      run([
        sample({ t: 0, northM: 0 }),
        sample({ t: 1, northM: 4 }),
        sample({ t: 2, northM: 400 }), // 400 m in 1 s
        sample({ t: 3, northM: 12 }),
      ]),
    ).toEqual(['ok', 'ok', 'jump', 'ok']);
  });

  it('re-anchors after repeated jumps (the previous fix was the bad one)', () => {
    const results = run([
      sample({ t: 0, northM: 0 }),
      ...[1, 2, 3, 4, 5].map((t) => sample({ t, northM: 2000 + t * 4 })),
    ]);
    expect(results).toEqual(['ok', 'jump', 'jump', 'jump', 'jump', 'ok']);
  });

  it('suppresses jitter while standing, but keeps a heartbeat every 10 s', () => {
    const standing = [0, 1, 2, 5, 10, 11].map((t) => sample({ t, northM: t % 2 }));
    expect(run(standing)).toEqual(['ok', 'jitter', 'jitter', 'jitter', 'ok', 'jitter']);
  });

  it('always accepts the first fix of a new segment (after resume)', () => {
    expect(run([sample({ t: 0 }), sample({ t: 60, northM: 5000, segment: 1 })])).toEqual([
      'ok',
      'ok',
    ]);
  });
});

describe('simplifyRoute', () => {
  it('reduces a straight line to its endpoints', () => {
    const track = straightTrack({ speedMps: 3, durationS: 300 });
    const simplified = simplifyRoute(track, 5);
    expect(simplified).toHaveLength(2);
    expect(simplified[0]).toBe(track[0]);
    expect(simplified[1]).toBe(track[track.length - 1]);
  });

  it('keeps corners that deviate more than the tolerance', () => {
    const corner = [
      { latitude: 0, longitude: 0 },
      { latitude: 0.0005, longitude: 0 },
      { latitude: 0.001, longitude: 0 }, // ~111 m north
      { latitude: 0.001, longitude: 0.0005 },
      { latitude: 0.001, longitude: 0.001 }, // then ~111 m east
    ];
    expect(simplifyRoute(corner, 5)).toEqual([corner[0], corner[2], corner[4]]);
  });

  it('returns short inputs unchanged', () => {
    const two = [
      { latitude: 0, longitude: 0 },
      { latitude: 1, longitude: 1 },
    ];
    expect(simplifyRoute(two)).toEqual(two);
  });
});
