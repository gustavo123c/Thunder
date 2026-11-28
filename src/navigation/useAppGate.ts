import { useAuth } from '@/features/auth';
import { useTermsAcceptance } from '@/features/legal';
import { useProfile } from '@/features/profile';
import { type AppGate, resolveAppGate } from '@/lib/app-gate';

/**
 * Composition point between the auth and profile features: decides which
 * area of the app the current user may see. Used by the root layout and the
 * entry route.
 */
export function useAppGate(): {
  gate: AppGate;
  profileQuery: ReturnType<typeof useProfile>;
  termsQuery: ReturnType<typeof useTermsAcceptance>;
} {
  const { session, isRestoring } = useAuth();
  const profileQuery = useProfile(session?.user.id);
  const termsQuery = useTermsAcceptance(session?.user.id);

  const gate = resolveAppGate({
    isRestoringSession: isRestoring,
    hasSession: session !== null,
    profileStatus: profileQuery.status,
    profile: profileQuery.data,
    termsStatus: termsQuery.status,
    termsAccepted: termsQuery.data === undefined ? undefined : termsQuery.data !== null,
  });

  return { gate, profileQuery, termsQuery };
}
