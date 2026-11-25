import { resolveAppGate } from '../app-gate';

const base = {
  isRestoringSession: false,
  hasSession: true,
  profileStatus: 'success' as const,
  profile: { onboardedAt: '2026-11-25T10:00:00Z' },
};

describe('resolveAppGate', () => {
  it('waits while the session is restored from storage', () => {
    expect(resolveAppGate({ ...base, isRestoringSession: true })).toBe('loading');
  });

  it('sends users without a session to auth', () => {
    expect(resolveAppGate({ ...base, hasSession: false })).toBe('signed_out');
  });

  it('waits for the first profile fetch', () => {
    expect(resolveAppGate({ ...base, profileStatus: 'pending', profile: undefined })).toBe(
      'loading',
    );
  });

  it('routes to onboarding until onboarded_at is set', () => {
    expect(resolveAppGate({ ...base, profile: { onboardedAt: null } })).toBe('onboarding');
    expect(resolveAppGate(base)).toBe('ready');
  });

  it('reports an error only when there is no cached profile', () => {
    expect(resolveAppGate({ ...base, profileStatus: 'error', profile: undefined })).toBe('error');
    expect(resolveAppGate({ ...base, profileStatus: 'error' })).toBe('ready');
  });
});
