import { Redirect } from 'expo-router';

import { useAppGate } from '@/navigation/useAppGate';

/** Entry route: sends the user to the area the root guard allows. */
export default function Index() {
  const { gate } = useAppGate();

  switch (gate) {
    case 'signed_out':
      return <Redirect href="/sign-in" />;
    case 'terms':
      return <Redirect href="/accept-terms" />;
    case 'onboarding':
      return <Redirect href="/onboarding" />;
    case 'ready':
      return <Redirect href="/feed" />;
    default:
      return null;
  }
}
