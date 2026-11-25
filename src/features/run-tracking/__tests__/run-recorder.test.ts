import type { RawLocation } from '@/domain/geo/location-sample';
import { METERS_PER_DEGREE_LAT, T0 } from '@/domain/testing/track-builder';

import { syncPendingRuns, uploadStoredRun } from '../api/run-upload.api';
import { defaultRunTitle } from '../run-title';
import { createMemoryRunRepository } from '../services/memory-run.repository';
import { ActiveRunExistsError, RunRecorder } from '../services/run-recorder';
import type { LocationTracker, RunRepository } from '../types';
import { buildFinishRunPayload } from '../upload-payload';

function fakeTracker(): LocationTracker & { started: boolean; startCalls: number } {
  return {
    started: false,
    startCalls: 0,
    async getPermission() {
      return 'granted';
    },
    async requestPermission() {
      return 'granted';
    },
    async start() {
      this.started = true;
      this.startCalls += 1;
    },
    async stop() {
      this.started = false;
    },
    async isStarted() {
      return this.started;
    },
  };
}

/** One fix per second heading north at `speed` m/s, starting `fromS` seconds after T0. */
function locations(fromS: number, count: number, speed = 3, startNorthM = 0): RawLocation[] {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: T0 + (fromS + i) * 1000,
    coords: {
      latitude: -23.55 + (startNorthM + speed * i) / METERS_PER_DEGREE_LAT,
      longitude: -46.63,
      altitude: 760,
      accuracy: 5,
      speed: -1, // iOS "unknown"
    },
  }));
}

function setup(repository: RunRepository = createMemoryRunRepository()) {
  const clock = { now: T0 };
  const tracker = fakeTracker();
  let ids = 0;
  const recorder = new RunRecorder({
    repository,
    tracker,
    now: () => clock.now,
    createId: () => `run-${(ids += 1)}`,
  });
  return { recorder, repository, tracker, clock };
}

describe('RunRecorder', () => {
  it('records a run with a pause and summarizes it on finish', async () => {
    const { recorder, repository, tracker, clock } = setup();

    await recorder.start('user-1');
    expect(tracker.started).toBe(true);

    await recorder.ingest(locations(0, 301)); // 300 s at 3 m/s = 900 m
    clock.now = T0 + 300_000;
    await recorder.pause();
    expect(tracker.started).toBe(false);

    // Fixes arriving while paused are ignored.
    expect(await recorder.ingest(locations(301, 10))).toBe(0);

    clock.now = T0 + 360_000;
    await recorder.resume();
    await recorder.ingest(locations(360, 201, 3, 1500)); // new segment, 600 m
    clock.now = T0 + 560_000;

    const finished = await recorder.finish({ weightKg: 70, title: 'Corrida matinal' });
    const summary = finished.summary!;

    expect(Math.abs(summary.distanceM - 1500)).toBeLessThan(10); // gap while paused not counted
    expect(summary.activeTimeS).toBe(500);
    expect(summary.elapsedTimeS).toBe(560);
    expect(summary.splits).toHaveLength(2);
    expect(recorder.snapshot().run).toBeNull();
    expect(await repository.listPendingRuns('user-1')).toHaveLength(1);
  });

  it('persists every accepted fix and restores an interrupted run', async () => {
    const repository = createMemoryRunRepository();
    const first = setup(repository);
    await first.recorder.start('user-1');
    await first.recorder.ingest(locations(0, 60));

    // App killed: a fresh runtime (e.g. headless background task) picks it up.
    const second = setup(repository);
    const snapshot = await second.recorder.restore();
    expect(snapshot.run?.session.status).toBe('running');
    expect(snapshot.samples).toHaveLength(60);
    expect(second.tracker.started).toBe(true); // GPS restarted

    await second.recorder.ingest(locations(60, 10, 3, 180));
    expect((await repository.getSamples('run-1')).length).toBe(70);
  });

  it('filters noisy fixes before storing them', async () => {
    const { recorder, repository } = setup();
    await recorder.start('user-1');
    const noisy = locations(0, 5);
    noisy[2] = { ...noisy[2]!, coords: { ...noisy[2]!.coords, accuracy: 120 } };
    noisy[3] = { ...noisy[3]!, coords: { ...noisy[3]!.coords, latitude: 0 } }; // jump

    expect(await recorder.ingest(noisy)).toBe(3);
    const stored = await repository.getSamples('run-1');
    expect(stored.map((s) => s.speedMps)).toEqual([null, null, null]); // -1 normalized
  });

  it('serializes operations so a late GPS batch cannot leak past a pause', async () => {
    const { recorder, clock } = setup();
    await recorder.start('user-1');
    clock.now = T0 + 10_000;
    const pause = recorder.pause();
    const late = recorder.ingest(locations(11, 5));
    await pause;
    expect(await late).toBe(0);
  });

  it('allows only one active run', async () => {
    const { recorder } = setup();
    await recorder.start('user-1');
    await expect(recorder.start('user-1')).rejects.toBeInstanceOf(ActiveRunExistsError);
  });

  it('rolls back the start when GPS cannot start', async () => {
    const { recorder, tracker, repository } = setup();
    tracker.start = async () => {
      throw new Error('location services disabled');
    };
    await expect(recorder.start('user-1')).rejects.toThrow('location services disabled');
    expect(await repository.getActiveRun()).toBeNull();
    expect(recorder.snapshot().run).toBeNull();
  });

  it('discards a run completely', async () => {
    const { recorder, repository } = setup();
    await recorder.start('user-1');
    await recorder.ingest(locations(0, 10));
    await recorder.discard();
    expect(await repository.getRun('run-1')).toBeNull();
    expect(await repository.getSamples('run-1')).toEqual([]);
  });

  it('notifies subscribers on every change', async () => {
    const { recorder } = setup();
    const seen: (string | undefined)[] = [];
    recorder.subscribe((s) => seen.push(s.run?.session.status));
    await recorder.start('user-1');
    await recorder.pause();
    await recorder.resume();
    expect(seen).toEqual([undefined, 'running', 'paused', 'running']);
  });
});

describe('upload', () => {
  async function finishedRun() {
    const ctx = setup();
    await ctx.recorder.start('user-1');
    await ctx.recorder.ingest(locations(0, 400));
    ctx.clock.now = T0 + 400_000;
    const run = await ctx.recorder.finish({ weightKg: 70, title: 'Treino' });
    return { ...ctx, run };
  }

  it('builds a payload that satisfies the database constraints', async () => {
    const { run, repository } = await finishedRun();
    const samples = await repository.getSamples(run.session.id);
    const payload = buildFinishRunPayload({
      clientId: run.session.id,
      title: '  ',
      visibility: 'public',
      summary: run.summary!,
      samples,
    });

    expect(payload.title).toBe('Corrida');
    expect(payload.moving_time_s).toBeLessThanOrEqual(payload.elapsed_time_s);
    expect(payload.points).toHaveLength(samples.length);
    expect(payload.points[0]).toMatchObject({ seq: 0, segment: 0 });
    expect(payload.route.length).toBeGreaterThanOrEqual(2);
    expect(payload.route.length).toBeLessThan(samples.length); // simplified
    expect(payload.route[0]).toEqual([samples[0]!.longitude, samples[0]!.latitude]);
    expect(payload.splits[0]).toMatchObject({ split_index: 0, distance_m: 1000 });
    expect(payload.splits.every((s) => Number.isInteger(s.duration_s) && s.duration_s >= 1)).toBe(
      true,
    );
  });

  it('deletes the local copy only after the server confirms', async () => {
    const { run, repository } = await finishedRun();
    const uploader = jest
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue('srv-1');

    await expect(uploadStoredRun(run, { repository, uploader })).rejects.toThrow('offline');
    expect(await repository.getRun(run.session.id)).not.toBeNull();

    expect(await uploadStoredRun(run, { repository, uploader })).toBe('srv-1');
    expect(await repository.getRun(run.session.id)).toBeNull();
    expect(uploader.mock.calls[0][0].client_id).toBe(run.session.id); // same id on retry
  });

  it('syncs pending runs and keeps the failed ones', async () => {
    const { repository } = await finishedRun();
    const result = await syncPendingRuns('user-1', {
      repository,
      uploader: jest.fn().mockResolvedValue('srv-9'),
    });
    expect(result).toEqual({ uploaded: ['srv-9'], failed: 0 });
    expect(await repository.listPendingRuns('user-1')).toEqual([]);
  });
});

describe('defaultRunTitle', () => {
  it.each([
    [6, 'Corrida matinal'],
    [14, 'Corrida da tarde'],
    [20, 'Corrida noturna'],
    [2, 'Corrida de madrugada'],
  ])('%p h → %p', (hour, title) => {
    expect(defaultRunTitle(new Date(2026, 10, 25, hour, 0))).toBe(title);
  });
});
