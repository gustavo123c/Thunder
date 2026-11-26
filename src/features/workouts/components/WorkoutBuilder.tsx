import { type ReactNode, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { HealthDisclaimer } from '@/components/ui/HealthDisclaimer';
import { describeRegion, type PainEntry } from '@/domain/health/body-regions';
import {
  WORKOUT_DURATIONS,
  WORKOUT_GOALS,
  type WorkoutDuration,
  type WorkoutGoal,
  type WorkoutPlan,
} from '@/domain/training/workout-generator';
import type { RunnerLevel } from '@/domain/types/profile';
import { formatPace, formatRunDate } from '@/lib/format';

import { useDeleteWorkout, useGenerateWorkout, useRecentWorkouts } from '../hooks/useWorkouts';
import { WorkoutPlanView } from './WorkoutPlanView';

const GOAL_LABELS: Record<WorkoutGoal, { label: string; hint: string }> = {
  pace: { label: 'Melhorar pace', hint: 'Intervalados para correr mais rápido' },
  endurance: { label: 'Resistência', hint: 'Correr por mais tempo, ritmo confortável' },
  strength: { label: 'Fortalecimento', hint: 'Força e core para prevenir lesões' },
};

const LEVEL_LABELS: Record<RunnerLevel, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
};

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      className={`rounded-full border-2 px-4 py-2 ${
        selected ? 'border-bolt-500 bg-bolt-500' : 'border-ink-200 dark:border-ink-600'
      }`}
    >
      <Text
        className={`text-sm font-semibold ${selected ? 'text-ink-900' : 'text-ink-600 dark:text-ink-200'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-ink-700 dark:text-ink-200">{label}</Text>
      <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
        {children}
      </View>
    </View>
  );
}

type WorkoutBuilderProps = {
  userId: string;
  defaultLevel: RunnerLevel;
  pains: readonly PainEntry[];
  recentPaceSPerKm: number | null;
};

/** Personalized workout form + generated plan + recently generated workouts. */
export function WorkoutBuilder({
  userId,
  defaultLevel,
  pains,
  recentPaceSPerKm,
}: WorkoutBuilderProps) {
  const [goal, setGoal] = useState<WorkoutGoal>('pace');
  const [level, setLevel] = useState<RunnerLevel>(defaultLevel);
  const [duration, setDuration] = useState<WorkoutDuration>(30);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const generate = useGenerateWorkout(userId);
  const recent = useRecentWorkouts(userId);
  const remove = useDeleteWorkout(userId);

  function handleGenerate() {
    generate.mutate(
      { goal, level, durationMin: duration, pains, recentPaceSPerKm },
      { onSuccess: setPlan },
    );
  }

  return (
    <View className="gap-5">
      <View className="gap-1">
        <Text className="text-xl font-bold text-ink-900 dark:text-ink-50">
          Treino personalizado
        </Text>
        <Text className="text-sm text-ink-500 dark:text-ink-300">
          Escolha seu objetivo e tempo. Consideramos seu nível, suas dores e seu pace recente.
        </Text>
      </View>

      <Field label="Objetivo">
        {WORKOUT_GOALS.map((g) => (
          <Chip
            key={g}
            label={GOAL_LABELS[g].label}
            selected={g === goal}
            onPress={() => setGoal(g)}
          />
        ))}
      </Field>
      <Text className="-mt-3 text-xs text-ink-400">{GOAL_LABELS[goal].hint}</Text>

      <Field label="Nível">
        {(Object.keys(LEVEL_LABELS) as RunnerLevel[]).map((l) => (
          <Chip
            key={l}
            label={LEVEL_LABELS[l]}
            selected={l === level}
            onPress={() => setLevel(l)}
          />
        ))}
      </Field>

      <Field label="Tempo disponível">
        {WORKOUT_DURATIONS.map((d) => (
          <Chip
            key={d}
            label={`${d} min`}
            selected={d === duration}
            onPress={() => setDuration(d)}
          />
        ))}
      </Field>

      <View className="gap-1 rounded-2xl bg-ink-100 p-3 dark:bg-ink-800">
        <Text className="text-xs text-ink-500 dark:text-ink-300">
          {pains.length > 0
            ? `Dores consideradas: ${pains.map((p) => describeRegion(p.region, p.side)).join(', ')}`
            : 'Nenhuma dor registrada no mapa corporal.'}
        </Text>
        <Text className="text-xs text-ink-500 dark:text-ink-300">
          {recentPaceSPerKm
            ? `Pace de referência (últimas corridas): ${formatPace(recentPaceSPerKm)}`
            : 'Sem corridas recentes: usaremos o esforço percebido como guia.'}
        </Text>
      </View>

      <Button label="⚡ Gerar treino" onPress={handleGenerate} loading={generate.isPending} />

      {plan ? (
        <>
          <WorkoutPlanView plan={plan} />
          <HealthDisclaimer withPain={pains.length > 0} />
        </>
      ) : null}

      {(recent.data ?? []).length > 0 ? (
        <View className="gap-2">
          <Text className="text-lg font-bold text-ink-900 dark:text-ink-50">Treinos recentes</Text>
          {recent.data?.map((saved) => (
            <Pressable
              key={saved.id}
              accessibilityRole="button"
              accessibilityHint="Toque e segure para apagar"
              onPress={() => setPlan(saved.plan)}
              onLongPress={() =>
                Alert.alert('Apagar treino salvo?', undefined, [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Apagar', style: 'destructive', onPress: () => remove.mutate(saved.id) },
                ])
              }
              className="flex-row items-center justify-between rounded-2xl bg-white p-4 active:opacity-80 dark:bg-ink-800"
            >
              <View className="flex-1 gap-0.5">
                <Text className="font-semibold text-ink-900 dark:text-ink-50">
                  {saved.plan.title}
                </Text>
                <Text className="text-xs text-ink-400">
                  {saved.plan.summary} · {formatRunDate(saved.createdAt)}
                </Text>
              </View>
              <Text className="text-bolt-600">Ver</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
