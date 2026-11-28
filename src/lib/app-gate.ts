import { isOnboarded, type Profile } from '@/domain/types/profile';

/**
 * Which part of the app the current user may see.
 * - loading: keep the splash screen up
 * - terms: the current Terms of Use version must be accepted before anything else
 * - error: signed in, but the profile (or the terms acceptance) could not be loaded
 */
export type AppGate = 'loading' | 'signed_out' | 'terms' | 'onboarding' | 'ready' | 'error';

type QueryStatus = 'pending' | 'error' | 'success';

type GateInput = {
  isRestoringSession: boolean;
  hasSession: boolean;
  profileStatus: QueryStatus;
  profile: Pick<Profile, 'onboardedAt'> | undefined;
  termsStatus: QueryStatus;
  /** Whether the current terms version was accepted; undefined until known. */
  termsAccepted: boolean | undefined;
};

export function resolveAppGate({
  isRestoringSession,
  hasSession,
  profileStatus,
  profile,
  termsStatus,
  termsAccepted,
}: GateInput): AppGate {
  if (isRestoringSession) return 'loading';
  if (!hasSession) return 'signed_out';
  // Terms come first: onboarding already collects body and health data.
  if (termsAccepted === false) return 'terms';
  if (termsAccepted === undefined) return termsStatus === 'error' ? 'error' : 'loading';
  // Keep showing cached data while a background refetch fails.
  if (profile) return isOnboarded(profile) ? 'ready' : 'onboarding';
  if (profileStatus === 'error') return 'error';
  return 'loading';
}
