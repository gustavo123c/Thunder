import { isOnboarded, type Profile } from '@/domain/types/profile';

/**
 * Which part of the app the current user may see.
 * - loading: keep the splash screen up
 * - error: signed in, but the profile could not be loaded
 */
export type AppGate = 'loading' | 'signed_out' | 'onboarding' | 'ready' | 'error';

type GateInput = {
  isRestoringSession: boolean;
  hasSession: boolean;
  profileStatus: 'pending' | 'error' | 'success';
  profile: Pick<Profile, 'onboardedAt'> | undefined;
};

export function resolveAppGate({
  isRestoringSession,
  hasSession,
  profileStatus,
  profile,
}: GateInput): AppGate {
  if (isRestoringSession) return 'loading';
  if (!hasSession) return 'signed_out';
  // Keep showing cached data while a background refetch fails.
  if (profile) return isOnboarded(profile) ? 'ready' : 'onboarding';
  if (profileStatus === 'error') return 'error';
  return 'loading';
}
