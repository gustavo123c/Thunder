import { Screen } from '@/components/ui/Screen';
import { useUserId } from '@/features/auth';
import { OnboardingFlow, useProfile } from '@/features/profile';

export default function OnboardingScreen() {
  const userId = useUserId();
  const { data: profile } = useProfile(userId);

  // The root guard only shows this route once the profile is loaded.
  if (!profile) return null;

  return (
    <Screen>
      <OnboardingFlow profile={profile} />
    </Screen>
  );
}
