import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { recurringPains } from '@/domain/health/pain-history';
import { recentAveragePace } from '@/domain/insights/activity';
import { useUserId } from '@/features/auth';
import { PainMapSection, useAnamnese, useOpenPains, usePainHistory } from '@/features/health';
import { useProfile } from '@/features/profile';
import { useActivity } from '@/features/progress';
import { useThemeColors } from '@/theme/theme';
import { type TrainingStep, TrainingStepper, WorkoutBuilder } from '@/features/workouts';

export default function TrainingScreen() {
  const userId = useUserId();
  const { data: profile } = useProfile(userId);
  const pains = useOpenPains(userId);
  const painHistory = usePainHistory(userId);
  const activity = useActivity(userId);
  const anamnese = useAnamnese(userId);
  const theme = useThemeColors();
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
      {anamnese.data === null ? (
        <Pressable
          onPress={() => router.push('/anamnese')}
          className="mx-4 mb-2 flex-row items-center gap-3 rounded-2xl border border-hairline bg-ink-800 px-4 py-3 active:opacity-80"
        >
          <Ionicons name="medical-outline" size={18} color={theme.ink[300]} />
          <Text className="flex-1 text-sm text-ink-300">
            Complete o questionário de saúde para personalizar seus treinos.
          </Text>
          <Ionicons name="chevron-forward" size={16} color={theme.ink[500]} />
        </Pressable>
      ) : null}
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
            goal={profile.mainGoal}
            recurring={recurring}
            onEditPains={() => setStep('body')}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
