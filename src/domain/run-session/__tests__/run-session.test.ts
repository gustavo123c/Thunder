import { activeTimeS } from '../../metrics/session-time';
import {
  currentSegment,
  finishRunSession,
  InvalidRunTransitionError,
  isActive,
  pauseRunSession,
  resumeRunSession,
  startRunSession,
} from '../run-session';

const T0 = 1_000_000;

describe('run session state machine', () => {
  it('runs start → pause → resume → finish', () => {
    let session = startRunSession('run-1', T0);
    expect(session.status).toBe('running');
    expect(currentSegment(session)).toBe(0);

    session = pauseRunSession(session, T0 + 60_000);
    expect(session.status).toBe('paused');
    expect(session.periods).toEqual([{ startedAt: T0, endedAt: T0 + 60_000 }]);

    session = resumeRunSession(session, T0 + 90_000);
    expect(currentSegment(session)).toBe(1);

    session = finishRunSession(session, T0 + 150_000);
    expect(session.status).toBe('finished');
    expect(activeTimeS(session.periods, Number.NaN)).toBe(120);
  });

  it('can finish directly from pause without adding time', () => {
    const paused = pauseRunSession(startRunSession('r', T0), T0 + 10_000);
    const finished = finishRunSession(paused, T0 + 99_000);
    expect(finished.periods).toEqual([{ startedAt: T0, endedAt: T0 + 10_000 }]);
  });

  it('rejects invalid transitions', () => {
    const running = startRunSession('r', T0);
    expect(() => resumeRunSession(running, T0)).toThrow(InvalidRunTransitionError);
    const finished = finishRunSession(running, T0 + 1);
    expect(() => pauseRunSession(finished, T0 + 2)).toThrow('Cannot pause a run that is finished');
    expect(() => finishRunSession(finished, T0 + 2)).toThrow(InvalidRunTransitionError);
  });

  it('never produces negative periods when the clock goes backwards', () => {
    const paused = pauseRunSession(startRunSession('r', T0), T0 - 5_000);
    expect(paused.periods[0]).toEqual({ startedAt: T0, endedAt: T0 });
  });

  it('reports whether a session is active', () => {
    expect(isActive(null)).toBe(false);
    expect(isActive(startRunSession('r', T0))).toBe(true);
    expect(isActive(finishRunSession(startRunSession('r', T0), T0 + 1))).toBe(false);
  });
});
