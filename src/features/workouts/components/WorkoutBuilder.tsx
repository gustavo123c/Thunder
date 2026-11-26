import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { HealthDisclaimer } from '@/components/ui/HealthDisclaimer';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { describeRegion, type PainEntry } from '@/domain/health/body-regions';
import {
  RUN_WORKOUT_TYPES,
  type RunWorkoutType,
  WORKOUT_DURATIONS,
  type WorkoutDuration,
  type WorkoutPlan,
} from '@/domain/training/workout-generator';
import type { RunnerLevel } from '@/domain/types/profile';
import { formatPace, formatRunDate } from '@/lib/format';
import { useThemeColors } from '@/theme/theme';
import { colors } from '@/theme/tokens';

import { useDeleteWorkout, useGenerateWorkout, useRecentWorkouts } from '../hooks/useWorkouts';
import { WorkoutPlanView } from './WorkoutPlanView';

type IconName = keyof typeof Ionicons.glyphMap;

const SESSIONS: Record<RunWorkoutType, { label: string; hint: string; icon: IconName }> = {
  intervals: { label: 'Tiros', hint: 'Curtos e fortes, com descanso', icon: 'flash' },
  fartlek: { label: 'Fartlek', hint: 'Alterna forte e leve', icon: 'shuffle' },
  tempo: { label: 'Limiar', hint: 'Confortavelmente forte', icon: 'speedometer' },
  hills: { label: 'Subidas', hint: 'Força e potência', icon: 'trending-up' },
  progressive: { label: 'Progressivo', hint: 'Começa leve, termina forte', icon: 'stats-chart' },
  easy: { label: 'Rodagem', hint: 'Leve e contínuo', icon: 'walk' },
  long: { label: 'Longão', hint: 'Resistência em ritmo lento', icon: 'infinite' },
  recovery: { label: 'Regenerativo', hint: 'Soltar a musculatura', icon: 'leaf' },
};

/** A long run needs time; shorter options become an easy run in the generator. */
const LONG_RUN_MIN: WorkoutDuration = 60;

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Iniciante' },
  { value: 'intermediate', label: 'Intermediário' },
] as const satisfies readonly { value: RunnerLevel; label: string }[];

const DURATION_OPTIONS = WORKOUT_DURATIONS.map((d) => ({ value: d, label: `${d} min` }));

function SessionCard({
  type,
  selected,
  onPress,
}: {
  type: RunWorkoutType;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useThemeColors();
  const copy = SESSIONS[type];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={copy.label}
      accessibilityHint={copy.hint}
      onPress={onPress}
      className={`w-[48.5%] flex-row items-center gap-3 rounded-[18px] border p-3 active:opacity-80 ${
        selected ? 'border-bolt-500 bg-bolt-500/10' : 'border-hairline bg-ink-800'
      }`}
    >
      <View
        className={`h-9 w-9 items-center justify-center rounded-full ${
          selected ? 'bg-bolt-500' : 'bg-ink-700'
        }`}
      >
        <Ionicons name={copy.icon} size={18} color={selected ? colors.onBolt : theme.ink[200]} />
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-extrabold text-ink-50" numberOfLines={1}>
          {copy.label}
        </Text>
        <Text className="text-xs leading-4 text-ink-400" numberOfLines={2}>
          {copy.hint}
        </Text>
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
  const theme = useThemeColors();
  return (
    <View className="flex-row items-center gap-3">
      <Ionicons name={icon} size={16} color={theme.ink[300]} />
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
  const theme = useThemeColors();
  const [type, setType] = useState<RunWorkoutType>('intervals');
  const [level, setLevel] = useState<RunnerLevel>(defaultLevel);
  const [duration, setDuration] = useState<WorkoutDuration>(30);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const generate = useGenerateWorkout(userId);
  const recent = useRecentWorkouts(userId);
  const remove = useDeleteWorkout(userId);

  function handleGenerate() {
    generate.mutate(
      { type, level, durationMin: duration, pains, recentPaceSPerKm },
      { onSuccess: setPlan },
    );
  }

  if (plan) {
    return (
      <View className="gap-5">
        <WorkoutPlanView plan={plan} />
        {plan.sessionType === 'rest' ? null : (
          <Button
            label="Iniciar este treino"
            icon="play"
            onPress={() => router.navigate('/record')}
          />
        )}
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
          Monte seu treino de corrida
        </Text>
        <Text className="text-sm text-ink-400">
          Os ritmos vêm das suas últimas corridas, e as dores marcadas reduzem a carga.
        </Text>
      </View>

      <Section title="Tipo de treino">
        <View
          accessibilityRole="radiogroup"
          className="flex-row flex-wrap justify-between gap-y-2.5"
        >
          {RUN_WORKOUT_TYPES.map((t) => (
            <SessionCard
              key={t}
              type={t}
              selected={t === type}
              onPress={() => {
                setType(t);
                if (t === 'long' && duration < LONG_RUN_MIN) setDuration(LONG_RUN_MIN);
              }}
            />
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
        {type === 'long' && duration < 45 ? (
          <Text className="text-xs text-ink-400">
            Com menos de 45 min, o longão vira uma rodagem leve.
          </Text>
        ) : null}
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
            <Text className="text-sm font-semibold text-accent">Revisar check-up corporal</Text>
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
                <Ionicons name="document-text-outline" size={18} color={theme.ink[200]} />
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="font-bold text-ink-50">{saved.plan.title}</Text>
                <Text className="text-xs text-ink-400">
                  {saved.plan.totalMinutes} min · {formatRunDate(saved.createdAt)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.ink[400]} />
            </Pressable>
          ))}
        </Section>
      ) : null}
    </View>
  );
}
