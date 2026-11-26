import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { HealthDisclaimer } from '@/components/ui/HealthDisclaimer';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
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
import { colors } from '@/theme/tokens';

import { useDeleteWorkout, useGenerateWorkout, useRecentWorkouts } from '../hooks/useWorkouts';
import { WorkoutPlanView } from './WorkoutPlanView';

type IconName = keyof typeof Ionicons.glyphMap;

const GOALS: Record<WorkoutGoal, { label: string; hint: string; icon: IconName }> = {
  pace: { label: 'Pace', hint: 'Intervalados para ganhar velocidade', icon: 'speedometer' },
  endurance: { label: 'Resistência', hint: 'Mais tempo em ritmo confortável', icon: 'infinite' },
  strength: { label: 'Fortalecimento', hint: 'Força e core contra lesões', icon: 'barbell' },
};

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Iniciante' },
  { value: 'intermediate', label: 'Intermediário' },
] as const satisfies readonly { value: RunnerLevel; label: string }[];

const DURATION_OPTIONS = WORKOUT_DURATIONS.map((d) => ({ value: d, label: `${d} min` }));

function GoalCard({
  goal,
  selected,
  onPress,
}: {
  goal: WorkoutGoal;
  selected: boolean;
  onPress: () => void;
}) {
  const copy = GOALS[goal];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={copy.label}
      accessibilityHint={copy.hint}
      onPress={onPress}
      className={`flex-1 gap-3 rounded-[20px] border p-3.5 active:opacity-80 ${
        selected ? 'border-bolt-500 bg-bolt-500/10' : 'border-hairline bg-ink-800'
      }`}
    >
      <View
        className={`h-10 w-10 items-center justify-center rounded-full ${
          selected ? 'bg-bolt-500' : 'bg-ink-700'
        }`}
      >
        <Ionicons name={copy.icon} size={20} color={selected ? colors.ink[900] : colors.ink[200]} />
      </View>
      <View className="gap-1">
        <Text
          className="text-[15px] font-extrabold text-ink-50"
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {copy.label}
        </Text>
        <Text className="text-xs leading-4 text-ink-400">{copy.hint}</Text>
      </View>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2.5">
      <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-ink-400">{title}</Text>
      {children}
    </View>
  );
}

function ContextRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <Ionicons name={icon} size={16} color={colors.ink[300]} />
      <Text className="text-sm text-ink-400">{label}</Text>
      <Text className="flex-1 text-right text-sm font-semibold text-ink-100" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

type WorkoutBuilderProps = {
  userId: string;
  defaultLevel: RunnerLevel;
  pains: readonly PainEntry[];
  recentPaceSPerKm: number | null;
  /** Goes back to the body check-up step. */
  onEditPains?: () => void;
};

/** Step 2 of the training tab: workout settings → structured workout sheet. */
export function WorkoutBuilder({
  userId,
  defaultLevel,
  pains,
  recentPaceSPerKm,
  onEditPains,
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

  if (plan) {
    return (
      <View className="gap-5">
        <WorkoutPlanView plan={plan} />
        <Button
          label="Iniciar este treino"
          icon="play"
          onPress={() => router.navigate('/record')}
        />
        <Button
          label="Montar outro treino"
          icon="options-outline"
          variant="secondary"
          onPress={() => setPlan(null)}
        />
        <HealthDisclaimer withPain={pains.length > 0} />
      </View>
    );
  }

  return (
    <View className="gap-6">
      <View className="gap-1">
        <Text accessibilityRole="header" className="text-2xl font-extrabold text-ink-50">
          Monte seu treino
        </Text>
        <Text className="text-sm text-ink-400">
          Consideramos seu nível, suas dores e seu pace recente.
        </Text>
      </View>

      <Section title="Objetivo">
        <View accessibilityRole="radiogroup" className="flex-row gap-2.5">
          {WORKOUT_GOALS.map((g) => (
            <GoalCard key={g} goal={g} selected={g === goal} onPress={() => setGoal(g)} />
          ))}
        </View>
      </Section>

      <Section title="Nível">
        <SegmentedControl
          accessibilityLabel="Nível"
          options={LEVEL_OPTIONS}
          value={level}
          onChange={setLevel}
        />
      </Section>

      <Section title="Tempo disponível">
        <SegmentedControl
          accessibilityLabel="Tempo disponível"
          options={DURATION_OPTIONS}
          value={duration}
          onChange={setDuration}
        />
      </Section>

      <View className="gap-3 rounded-[20px] border border-hairline bg-ink-800 p-4">
        <ContextRow
          icon="body-outline"
          label="Dores"
          value={
            pains.length > 0
              ? pains.map((p) => describeRegion(p.region, p.side)).join(', ')
              : 'Nenhuma'
          }
        />
        <ContextRow
          icon="speedometer-outline"
          label="Pace de referência"
          value={recentPaceSPerKm ? formatPace(recentPaceSPerKm) : 'Esforço percebido'}
        />
        {onEditPains ? (
          <Pressable
            accessibilityRole="button"
            onPress={onEditPains}
            hitSlop={8}
            className="self-start"
          >
            <Text className="text-sm font-semibold text-bolt-500">Revisar check-up corporal</Text>
          </Pressable>
        ) : null}
      </View>

      <Button
        label="Gerar treino"
        icon="flash"
        onPress={handleGenerate}
        loading={generate.isPending}
      />

      {(recent.data ?? []).length > 0 ? (
        <Section title="Treinos recentes">
          {recent.data?.map((saved) => (
            <Pressable
              key={saved.id}
              accessibilityRole="button"
              accessibilityHint="Toque para abrir, segure para apagar"
              onPress={() => setPlan(saved.plan)}
              onLongPress={() =>
                Alert.alert('Apagar treino salvo?', undefined, [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Apagar', style: 'destructive', onPress: () => remove.mutate(saved.id) },
                ])
              }
              className="flex-row items-center gap-3 rounded-[20px] border border-hairline bg-ink-800 p-4 active:opacity-80"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-ink-700">
                <Ionicons name="document-text-outline" size={18} color={colors.ink[200]} />
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="font-bold text-ink-50">{saved.plan.title}</Text>
                <Text className="text-xs text-ink-400">
                  {saved.plan.totalMinutes} min · {formatRunDate(saved.createdAt)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.ink[400]} />
            </Pressable>
          ))}
        </Section>
      ) : null}
    </View>
  );
}
