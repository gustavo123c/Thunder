import { useMemo } from 'react';
import { KeyboardAvoidingView, ScrollView } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { recentAveragePace } from '@/domain/insights/activity';
import { useUserId } from '@/features/auth';
import { PainMapSection, useOpenPains } from '@/features/health';
import { useProfile } from '@/features/profile';
import { useActivity } from '@/features/progress';
import { WorkoutBuilder } from '@/features/workouts';

export default function TrainingScreen() {
  const userId = useUserId();
  const { data: profile } = useProfile(userId);
  const pains = useOpenPains(userId);
  const activity = useActivity(userId);

  const recentPace = useMemo(
    () => (activity.data ? recentAveragePace(activity.data) : null),
    [activity.data],
  );

  if (!profile) return null;

  return (
    <Screen>
      <KeyboardAvoidingView className="flex-1">
        <ScrollView contentContainerClassName="gap-8 py-6" keyboardShouldPersistTaps="handled">
          <PainMapSection userId={userId} sex={profile.sex} />
          <WorkoutBuilder
            userId={userId}
            defaultLevel={profile.level ?? 'beginner'}
            pains={pains.data ?? []}
            recentPaceSPerKm={recentPace}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
