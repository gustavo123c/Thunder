import type { ActivePeriod } from '../types/run';

export type RunStatus = 'running' | 'paused' | 'finished';

/** Lifecycle of a run being recorded. Pure state machine; persistence lives elsewhere. */
export type RunSession = {
  id: string; // also the client_id used for idempotent upload
  status: RunStatus;
  periods: ActivePeriod[];
};

export class InvalidRunTransitionError extends Error {
  constructor(action: string, status: RunStatus) {
    super(`Cannot ${action} a run that is ${status}`);
    this.name = 'InvalidRunTransitionError';
  }
}

function closeLastPeriod(periods: readonly ActivePeriod[], now: number): ActivePeriod[] {
  return periods.map((period, index) =>
    index === periods.length - 1 && period.endedAt === null
      ? { ...period, endedAt: Math.max(now, period.startedAt) }
      : period,
  );
}

export function startRunSession(id: string, now: number): RunSession {
  return { id, status: 'running', periods: [{ startedAt: now, endedAt: null }] };
}

export function pauseRunSession(session: RunSession, now: number): RunSession {
  if (session.status !== 'running') throw new InvalidRunTransitionError('pause', session.status);
  return { ...session, status: 'paused', periods: closeLastPeriod(session.periods, now) };
}

export function resumeRunSession(session: RunSession, now: number): RunSession {
  if (session.status !== 'paused') throw new InvalidRunTransitionError('resume', session.status);
  return {
    ...session,
    status: 'running',
    periods: [...session.periods, { startedAt: now, endedAt: null }],
  };
}

export function finishRunSession(session: RunSession, now: number): RunSession {
  if (session.status === 'finished') throw new InvalidRunTransitionError('finish', 'finished');
  return { ...session, status: 'finished', periods: closeLastPeriod(session.periods, now) };
}

/** GPS segment index for new samples: one segment per active period. */
export function currentSegment(session: RunSession): number {
  return Math.max(0, session.periods.length - 1);
}

export function isActive(session: RunSession | null | undefined): session is RunSession {
  return session?.status === 'running' || session?.status === 'paused';
}
