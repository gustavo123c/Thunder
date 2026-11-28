import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { recurringPains } from '@/domain/health/pain-history';
import { recentAveragePace } from '@/domain/insights/activity';
import { useUserId } from '@/features/auth';
import { PainMapSection, useAnamnese, useOpenPains, usePainHistory } from '@/features/health';
import { useHealthConsent, useProfile } from '@/features/profile';
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
  const consent = useHealthConsent(userId);
  const [step, setStep] = useState<TrainingStep>('body');
  const [anamneseDismissed, setAnamneseDismissed] = useState(false);
  const { height: windowHeight } = useWindowDimensions();
  // Leaves room for the stepper, title, tab bar and the "continue" button on one screen.
  const bodyHeight = Math.round(Math.min(420, Math.max(280, windowHeight * 0.46)));

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

  // Without health data consent there is no body check-up: straight to the workout.
  if (!profile.healthConsentAt) {
    return (
      <Screen>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-6 pb-10 pt-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row items-center gap-3 rounded-2xl border border-hairline bg-ink-800 py-3 pl-4 pr-3">
            <Ionicons name="body-outline" size={18} color={theme.ink[300]} />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-ink-100">
                Treinos adaptados a dores desligados
              </Text>
              <Text className="text-xs text-ink-400">
                Autorize o uso de dados de saúde para marcar dores e ajustar a carga.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Autorizar uso de dados de saúde"
              disabled={consent.pending}
              onPress={consent.askToGrant}
              hitSlop={8}
              className="rounded-full bg-bolt-500 px-3 py-1.5 active:opacity-80"
            >
              <Text className="text-xs font-bold text-onbolt">Ativar</Text>
            </Pressable>
          </View>
          <WorkoutBuilder
            userId={userId}
            defaultLevel={profile.level ?? 'beginner'}
            pains={[]}
            recentPaceSPerKm={recentPace}
            goal={profile.mainGoal}
          />
        </ScrollView>
      </Screen>
    );
  }

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
          <PainMapSection userId={userId} sex={profile.sex} bodyHeight={bodyHeight} />
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
          {anamnese.data === null && !anamneseDismissed ? (
            <View className="flex-row items-center gap-3 rounded-2xl border border-hairline bg-ink-800 py-3 pl-4 pr-2">
              <Ionicons name="medical-outline" size={18} color={theme.ink[300]} />
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/anamnese')}
                className="flex-1 active:opacity-70"
              >
                <Text className="text-sm font-semibold text-ink-100">Questionário de saúde</Text>
                <Text className="text-xs text-ink-400">
                  Deixa os treinos mais seguros para você.
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Agora não"
                hitSlop={8}
                onPress={() => setAnamneseDismissed(true)}
                className="h-8 w-8 items-center justify-center rounded-full active:bg-ink-700"
              >
                <Ionicons name="close" size={16} color={theme.ink[400]} />
              </Pressable>
            </View>
          ) : null}
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
