import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { recurringPains } from '@/domain/health/pain-history';
import { recentAveragePace } from '@/domain/insights/activity';
import { useUserId } from '@/features/auth';
import { PainMapSection, useOpenPains, usePainHistory } from '@/features/health';
import { useProfile } from '@/features/profile';
import { useActivity } from '@/features/progress';
import { type TrainingStep, TrainingStepper, WorkoutBuilder } from '@/features/workouts';

export default function TrainingScreen() {
  const userId = useUserId();
  const { data: profile } = useProfile(userId);
  const pains = useOpenPains(userId);
  const painHistory = usePainHistory(userId);
  const activity = useActivity(userId);
  const [step, setStep] = useState<TrainingStep>('body');

  // Android back button / gesture: from the workout step, go back to the check-up first.
  useFocusEffect(
    useCallback(() => {
      if (step !== 'workout') return undefined;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        setStep('body');
        return true;
      });
      return () => subscription.remove();
    }, [step]),
  );

  const recurring = useMemo(
    () => (painHistory.data ? recurringPains(painHistory.data, new Date()) : []),
    [painHistory.data],
  );

  const recentPace = useMemo(
    () => (activity.data ? recentAveragePace(activity.data) : null),
    [activity.data],
  );

  if (!profile) return null;

  const painCount = pains.data?.length ?? 0;

  return (
    <Screen>
      <View className="pb-2 pt-3">
        <TrainingStepper step={step} onChange={setStep} />
      </View>
      <KeyboardAvoidingView className="flex-1">
        {/* Both steps stay mounted (hidden) so switching keeps the generated workout. */}
        <ScrollView
          className={step === 'body' ? 'flex-1' : 'hidden'}
          contentContainerClassName="gap-6 pb-10 pt-4"
          showsVerticalScrollIndicator={false}
        >
          <PainMapSection userId={userId} sex={profile.sex} />
          <Button
            label={painCount > 0 ? 'Continuar para o treino' : 'Estou sem dores · continuar'}
            icon="arrow-forward"
            onPress={() => setStep('workout')}
          />
        </ScrollView>
        <ScrollView
          className={step === 'workout' ? 'flex-1' : 'hidden'}
          contentContainerClassName="gap-6 pb-10 pt-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <WorkoutBuilder
            userId={userId}
            defaultLevel={profile.level ?? 'beginner'}
            pains={pains.data ?? []}
            recentPaceSPerKm={recentPace}
            recurring={recurring}
            onEditPains={() => setStep('body')}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
