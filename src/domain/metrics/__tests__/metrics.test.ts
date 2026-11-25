import { filterGpsSamples } from '../../geo/gps-filter';
import { continueTrack, lastOf, straightTrack, T0 } from '../../testing/track-builder';
import { caloriesForActivity, estimateCaloriesKcal, metForSpeedKmh } from '../calories';
import { elevationGainM } from '../elevation';
import { buildIntervals, movingTimeS, totalDistanceM } from '../intervals';
import { currentPaceSPerKm, paceSPerKm, speedMpsToPace } from '../pace';
import { summarizeRun } from '../run-summary';
import { activeTimeS, elapsedTimeS } from '../session-time';
import { bestSplitPaceSPerKm, computeSplits } from '../splits';

describe('intervals', () => {
  it('measures distance and moving time of a constant-speed track', () => {
    const intervals = buildIntervals(straightTrack({ speedMps: 3, durationS: 100 }));
    expect(totalDistanceM(intervals)).toBeCloseTo(300, 1);
    expect(movingTimeS(intervals)).toBeCloseTo(100, 6);
  });

  it('never measures distance across a pause (segment change)', () => {
    const first = straightTrack({ speedMps: 3, durationS: 100 });
    // After resuming, the runner is 500 m away (walked while paused) — must not count.
    const resumed = straightTrack({
      startLat: lastOf(first).latitude + 0.0045,
      startTime: lastOf(first).timestamp + 120_000,
      speedMps: 3,
      durationS: 100,
      segment: 1,
    });
    const intervals = buildIntervals([...first, ...resumed]);
    expect(totalDistanceM(intervals)).toBeCloseTo(600, 1);
    expect(movingTimeS(intervals)).toBeCloseTo(200, 6);
  });

  it('excludes standing time from moving time', () => {
    const running = straightTrack({ speedMps: 3, durationS: 60 });
    const standing = straightTrack({
      startLat: lastOf(running).latitude,
      startTime: lastOf(running).timestamp + 10_000,
      speedMps: 0,
      durationS: 50,
      intervalS: 10,
    });
    const intervals = buildIntervals([...running, ...standing]);
    expect(movingTimeS(intervals)).toBeCloseTo(60, 6);
  });

  it('does not trust distance of physically impossible intervals', () => {
    const track = straightTrack({ speedMps: 3, durationS: 2 });
    const teleported = { ...lastOf(track), timestamp: lastOf(track).timestamp + 1000, latitude: 0 };
    const intervals = buildIntervals([...track, teleported]);
    expect(totalDistanceM(intervals)).toBeCloseTo(6, 1);
    expect(intervals[intervals.length - 1]?.moving).toBe(false);
  });
});

describe('session time', () => {
  const periods = [
    { startedAt: T0, endedAt: T0 + 600_000 }, // 10 min
    { startedAt: T0 + 720_000, endedAt: T0 + 1_320_000 }, // pause 2 min, then 10 min
  ];

  it('active time excludes pauses; elapsed time includes them', () => {
    expect(activeTimeS(periods, T0 + 2_000_000)).toBe(1200);
    expect(elapsedTimeS(periods, T0 + 2_000_000)).toBe(1320);
  });

  it('counts an open period up to now (live timer)', () => {
    const live = [{ startedAt: T0, endedAt: null }];
    expect(activeTimeS(live, T0 + 42_500)).toBe(42.5);
    expect(elapsedTimeS([], T0)).toBe(0);
  });
});

describe('pace', () => {
  it('computes seconds per km', () => {
    expect(paceSPerKm(1000, 330)).toBe(330);
    expect(paceSPerKm(5000, 1500)).toBe(300);
  });

  it('returns null without enough distance or time', () => {
    expect(paceSPerKm(30, 10)).toBeNull();
    expect(paceSPerKm(1000, 0)).toBeNull();
    expect(paceSPerKm(Number.NaN, 10)).toBeNull();
  });

  it('converts speed to pace', () => {
    expect(speedMpsToPace(3)).toBeCloseTo(333.33, 2);
    expect(speedMpsToPace(0)).toBeNull();
  });

  it('current pace reflects only the last 30 s', () => {
    const slow = straightTrack({ speedMps: 2.5, durationS: 120 }); // 6:40 /km
    const fast = continueTrack(slow, { speedMps: 4, durationS: 60 }); // 4:10 /km
    const intervals = buildIntervals([...slow, ...fast]);
    expect(currentPaceSPerKm(intervals)).toBeCloseTo(250, 0);
  });

  it('current pace is null right after resuming and while standing', () => {
    const before = straightTrack({ speedMps: 3, durationS: 60 });
    const resumed = continueTrack(before, { speedMps: 3, durationS: 4, segment: 1, gapS: 30 });
    expect(currentPaceSPerKm(buildIntervals([...before, ...resumed]))).toBeNull();

    const standing = continueTrack(before, { speedMps: 0, durationS: 60, intervalS: 10 });
    expect(currentPaceSPerKm(buildIntervals([...before, ...standing]))).toBeNull();
  });
});

describe('splits', () => {
  it('interpolates exact 1 km boundaries regardless of sampling rate', () => {
    // 3500 m at 3 m/s sampled every 7 s: boundaries fall inside intervals.
    const track = straightTrack({ speedMps: 3, durationS: 3500 / 3, intervalS: 7 });
    const intervals = buildIntervals(track);
    const splits = computeSplits(intervals);

    expect(splits).toHaveLength(4);
    for (const split of splits.slice(0, 3)) {
      expect(split.distanceM).toBeCloseTo(1000, 6);
      expect(split.durationS).toBeCloseTo(333.33, 1);
      expect(split.paceSPerKm).toBeCloseTo(333.33, 1);
    }
    // Last fix lands at 1162 s (sampling every 7 s) → partial split of the remainder.
    expect(splits[3]?.distanceM).toBeCloseTo(totalDistanceM(intervals) - 3000, 6);
    expect(splits.map((s) => s.index)).toEqual([0, 1, 2, 3]);
  });

  it('reports elevation change per split', () => {
    // Climbs 1 m every 100 m → +10 m per km.
    const track = straightTrack({
      speedMps: 2,
      durationS: 1000,
      altitude: (t) => 700 + (2 * t) / 100,
    });
    const splits = computeSplits(buildIntervals(track));
    expect(splits[0]?.elevationDeltaM).toBeCloseTo(10, 6);
    expect(splits[1]?.elevationDeltaM).toBeCloseTo(10, 6);
  });

  it('finds the fastest full kilometer', () => {
    const firstKm = straightTrack({ speedMps: 1000 / 300, durationS: 300 }); // 5:00
    const secondKm = continueTrack(firstKm, { speedMps: 1000 / 360, durationS: 359 }); // 6:00
    const splits = computeSplits(buildIntervals([...firstKm, ...secondKm]));
    expect(splits).toHaveLength(2);
    expect(bestSplitPaceSPerKm(splits)).toBeCloseTo(300, 0);
  });

  it('drops a tiny trailing split and has no best pace before 1 km', () => {
    const track = straightTrack({ speedMps: 3, durationS: 2 });
    expect(computeSplits(buildIntervals(track))).toEqual([]);
    expect(bestSplitPaceSPerKm([])).toBeNull();
  });
});

describe('elevationGainM', () => {
  it('ignores altitude noise on flat ground', () => {
    // Deterministic ±4 m noise (8 m peak to peak).
    const noise = [3, -4, 1, 4, -2, -3, 2, 0, -1, 4, -4, 2];
    const noisy = straightTrack({
      speedMps: 3,
      durationS: 600,
      altitude: (t) => 760 + (noise[t % noise.length] as number),
    });
    expect(elevationGainM(noisy)).toBe(0);
  });

  it('counts each real hill once on a hilly route', () => {
    // Two 20 m hills: up and down, up and down.
    const profile = (t: number) => 760 + 20 * Math.abs(Math.sin((Math.PI * t) / 300));
    const hilly = straightTrack({ speedMps: 3, durationS: 600, altitude: profile });
    // Smoothing rounds off sharp valleys: a little real climb is traded for noise immunity.
    expect(elevationGainM(hilly)).toBeGreaterThan(32);
    expect(elevationGainM(hilly)).toBeLessThanOrEqual(40);
  });

  it('measures a real climb', () => {
    const climb = straightTrack({
      speedMps: 3,
      durationS: 500,
      altitude: (t) => 760 + t / 10 + (t % 2 === 0 ? 1 : -1),
    });
    expect(elevationGainM(climb)).toBeGreaterThan(45);
    expect(elevationGainM(climb)).toBeLessThan(53);
  });

  it('is null without altitude data', () => {
    expect(
      elevationGainM(straightTrack({ speedMps: 3, durationS: 10, altitude: () => null })),
    ).toBeNull();
  });
});

describe('calories', () => {
  it('interpolates MET from the Compendium table', () => {
    expect(metForSpeedKmh(9.7)).toBeCloseTo(9.8, 6);
    expect(metForSpeedKmh(10)).toBeCloseTo(9.99, 2);
    expect(metForSpeedKmh(1)).toBe(2.8);
    expect(metForSpeedKmh(40)).toBe(23);
  });

  it('applies kcal = MET × kg × h', () => {
    expect(caloriesForActivity(10, 70, 3600)).toBe(700);
  });

  it('estimates ~700 kcal for 1 h at 10 km/h and 70 kg', () => {
    const track = straightTrack({ speedMps: 10 / 3.6, durationS: 3600, intervalS: 5 });
    expect(estimateCaloriesKcal(buildIntervals(track), 70)).toBeCloseTo(699.3, 0);
  });

  it('is null without body weight', () => {
    const track = straightTrack({ speedMps: 3, durationS: 60 });
    expect(estimateCaloriesKcal(buildIntervals(track), null)).toBeNull();
  });
});

describe('summarizeRun', () => {
  it('summarizes a run with a pause', () => {
    const first = straightTrack({ speedMps: 3, durationS: 600 });
    const second = continueTrack(first, { speedMps: 3, durationS: 600, segment: 1, gapS: 120 });
    const samples = filterGpsSamples([...first, ...second]);

    const summary = summarizeRun({
      samples,
      periods: [
        { startedAt: T0, endedAt: T0 + 600_000 },
        { startedAt: T0 + 720_000, endedAt: T0 + 1_320_000 },
      ],
      weightKg: 70,
    });

    // The jitter filter may drop the last < 2 m of each segment.
    expect(Math.abs(summary.distanceM - 3600)).toBeLessThan(10);
    expect(summary.elapsedTimeS).toBe(1320);
    expect(summary.activeTimeS).toBe(1200);
    expect(Math.abs(summary.movingTimeS - 1200)).toBeLessThan(5);
    expect(summary.avgPaceSPerKm).toBeCloseTo(333.3, 0);
    expect(summary.bestPaceSPerKm).toBeCloseTo(333.3, 0);
    expect(summary.splits).toHaveLength(4);
    expect(summary.elevationGainM).toBe(0);
    expect(summary.caloriesKcal).toBeGreaterThan(150);
    expect(summary.caloriesKcal).toBeLessThan(250);
  });

  it('requires a finished run', () => {
    expect(() =>
      summarizeRun({ samples: [], periods: [{ startedAt: T0, endedAt: null }], weightKg: 70 }),
    ).toThrow('closed active period');
  });
});
