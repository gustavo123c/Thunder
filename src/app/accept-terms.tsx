import { Screen } from '@/components/ui/Screen';
import { useSignOut, useUserId } from '@/features/auth';
import { AcceptTerms } from '@/features/legal';

/** Shown by the root guard until the current Terms of Use version is accepted. */
export default function AcceptTermsScreen() {
  const userId = useUserId();
  const signOut = useSignOut();
  return (
    <Screen>
      <AcceptTerms userId={userId} onSignOut={() => signOut.mutate()} />
    </Screen>
  );
}
