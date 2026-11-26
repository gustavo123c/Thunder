import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { type ReactNode, useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { HealthDisclaimer } from '@/components/ui/HealthDisclaimer';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextField } from '@/components/ui/TextField';
import { describeRegion, type PainEntry } from '@/domain/health/body-regions';
import type { Recurrence } from '@/domain/health/pain-history';
import { CUSTOM_GOAL_MAX_LENGTH } from '@/domain/training/custom-goal';
import {
  RUN_WORKOUT_TYPES,
  type RunWorkoutType,
  type TrainingLevel,
  WORKOUT_DURATIONS,
  type WorkoutDuration,
  type WorkoutPlan,
} from '@/domain/training/workout-generator';
import { formatPace, formatRunDate } from '@/lib/format';
import { useThemeColors } from '@/theme/theme';
import { colors } from '@/theme/tokens';

import { useActiveWorkoutStore } from '../active-workout.store';
import type { SavedWorkout } from '../api/workouts.api';
import { findReturningPain, recentDiscomfortRegions } from '../feedback';
import { useDeleteWorkout, useGenerateWorkout, useRecentWorkouts } from '../hooks/useWorkouts';
import { WorkoutPlanView } from './WorkoutPlanView';

type IconName = keyof typeof Ionicons.glyphMap;
type SessionChoice = RunWorkoutType | 'custom';

const SESSIONS: Record<SessionChoice, { label: string; hint: string; icon: IconName }> = {
  intervals: { label: 'Tiros', hint: 'Curtos e fortes, com descanso', icon: 'flash' },
  fartlek: { label: 'Fartlek', hint: 'Alterna forte e leve', icon: 'shuffle' },
  tempo: { label: 'Limiar', hint: 'Confortavelmente forte', icon: 'speedometer' },
  hills: { label: 'Subidas', hint: 'Força e potência', icon: 'trending-up' },
  progressive: { label: 'Progressivo', hint: 'Começa leve, termina forte', icon: 'stats-chart' },
  easy: { label: 'Rodagem', hint: 'Leve e contínuo', icon: 'walk' },
  long: { label: 'Longão', hint: 'Resistência em ritmo lento', icon: 'infinite' },
  recovery: { label: 'Regenerativo', hint: 'Soltar a musculatura', icon: 'leaf' },
  custom: { label: 'Outro', hint: 'Descreva seu objetivo', icon: 'create-outline' },
};

const SESSION_CHOICES: readonly SessionChoice[] = [...RUN_WORKOUT_TYPES, 'custom'];

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Iniciante' },
  { value: 'intermediate', label: 'Intermediário' },
  { value: 'advanced', label: 'Avançado' },
] as const satisfies readonly { value: TrainingLevel; label: string }[];

const DURATION_OPTIONS = WORKOUT_DURATIONS.map((d) => ({ value: d, label: `${d} min` }));

/** A long run needs time; shorter options become an easy run in the generator. */
const LONG_RUN_MIN: WorkoutDuration = 60;

const FEEDBACK_LABEL = {
  helped: 'ajudou muito',
  neutral: 'neutro',
  discomfort: 'ainda com desconforto',
} as const;

function SessionCard({
  type,
  selected,
  onPress,
}: {
  type: SessionChoice;
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

/** "Essa dor voltou": offers to repeat the last workout generated for it, or adjust. */
function ReturningPainCard({
  recurrence,
  previous,
  onRepeat,
}: {
  recurrence: Recurrence;
  previous: SavedWorkout;
  onRepeat: () => void;
}) {
  const theme = useThemeColors();
  const where = describeRegion(recurrence.region, recurrence.side).toLowerCase();
  return (
    <View className="gap-3 rounded-[20px] border border-bolt-500/30 bg-bolt-500/10 p-4">
      <View className="flex-row items-center gap-2">
        <Ionicons name="repeat" size={16} color={theme.accent} />
        <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-accent">
          Dor recorrente
        </Text>
      </View>
      <Text className="text-sm leading-5 text-ink-100">
        Essa dor em {where} voltou ({recurrence.count} vezes em 30 dias). Último treino adaptado:{' '}
        <Text className="font-bold text-ink-50">{previous.plan.title}</Text>
        {previous.feedback ? ` — você disse: ${FEEDBACK_LABEL[previous.feedback]}.` : '.'}
      </Text>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button
            label="Repetir esse treino"
            icon="refresh"
            variant="secondary"
            onPress={onRepeat}
          />
        </View>
      </View>
      <Text className="text-xs text-ink-400">Ou ajuste as opções abaixo e gere um novo.</Text>
    </View>
  );
}

type CurrentWorkout = { id: string; plan: WorkoutPlan };

type WorkoutBuilderProps = {
  userId: string;
  defaultLevel: TrainingLevel;
  pains: readonly PainEntry[];
  recentPaceSPerKm: number | null;
  /** Pains reported repeatedly in the last 30 days (from the pain history). */
  recurring?: readonly Recurrence[];
  /** Goes back to the body check-up step. */
  onEditPains?: () => void;
};

/** Step 2 of the training tab: workout settings → structured workout sheet. */
export function WorkoutBuilder({
  userId,
  defaultLevel,
  pains,
  recentPaceSPerKm,
  recurring = [],
  onEditPains,
}: WorkoutBuilderProps) {
  const [type, setType] = useState<SessionChoice>('intervals');
  const [customGoal, setCustomGoal] = useState('');
  const [level, setLevel] = useState<TrainingLevel>(defaultLevel);
  const [duration, setDuration] = useState<WorkoutDuration>(30);
  const [current, setCurrent] = useState<CurrentWorkout | null>(null);
  const generate = useGenerateWorkout(userId);
  const recent = useRecentWorkouts(userId);
  const remove = useDeleteWorkout(userId);
  const startWorkout = useActiveWorkoutStore((s) => s.start);

  const saved = useMemo(() => recent.data ?? [], [recent.data]);

  // Regions where a recent workout still left discomfort → the generator goes easier.
  const discomfortRegions = useMemo(() => recentDiscomfortRegions(saved), [saved]);

  // A recurring pain that is open right now and already had a workout adapted for it.
  const returning = useMemo(
    () => findReturningPain(recurring, pains, saved),
    [pains, recurring, saved],
  );

  const customMissing = type === 'custom' && customGoal.trim().length < 3;

  function handleGenerate() {
    generate.mutate(
      {
        type,
        customGoal: type === 'custom' ? customGoal.trim() : undefined,
        level,
        durationMin: duration,
        pains,
        recentPaceSPerKm,
        discomfortRegions,
      },
      { onSuccess: setCurrent },
    );
  }

  function handleStart(workout: CurrentWorkout) {
    startWorkout({ id: workout.id, title: workout.plan.title, forPain: pains.length > 0 });
    router.navigate('/record');
  }

  if (current) {
    return (
      <View className="gap-5">
        <WorkoutPlanView plan={current.plan} />
        {current.plan.sessionType === 'rest' ? null : (
          <Button label="Iniciar este treino" icon="play" onPress={() => handleStart(current)} />
        )}
        <Button
          label="Montar outro treino"
          icon="options-outline"
          variant="secondary"
          onPress={() => setCurrent(null)}
        />
        <Button
          label="Base científica e fontes"
          icon="library-outline"
          variant="ghost"
          onPress={() => router.push('/sources')}
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

      {returning ? (
        <ReturningPainCard
          recurrence={returning.recurrence}
          previous={returning.previous}
          onRepeat={() => setCurrent({ id: returning.previous.id, plan: returning.previous.plan })}
        />
      ) : null}

      <Section title="Tipo de treino">
        <View
          accessibilityRole="radiogroup"
          className="flex-row flex-wrap justify-between gap-y-2.5"
        >
          {SESSION_CHOICES.map((t) => (
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
        {type === 'custom' ? (
          <View className="gap-1.5">
            <TextField
              label="O que você busca?"
              value={customGoal}
              onChangeText={setCustomGoal}
              placeholder="Ex.: preparação para 10 km em 45 min"
              maxLength={CUSTOM_GOAL_MAX_LENGTH}
              returnKeyType="done"
            />
            <Text className="text-xs leading-4 text-ink-400">
              Entendemos palavras como tiros, fartlek, limiar, subida, longão, regenerativo e metas
              como “5 km em 25 min”.
            </Text>
          </View>
        ) : null}
      </Section>

      <Section title="Nível">
        <SegmentedControl
          accessibilityLabel="Nível"
          options={LEVEL_OPTIONS}
          value={level}
          onChange={setLevel}
        />
        {level === 'advanced' ? (
          <Text className="text-xs leading-4 text-ink-400">
            Inclui tiros de VO2máx, tempo run e zonas de frequência cardíaca (Z1–Z5).
          </Text>
        ) : null}
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
        {discomfortRegions.length > 0 ? (
          <ContextRow
            icon="chatbubble-ellipses-outline"
            label="Último check-in"
            value="Desconforto — carga menor"
          />
        ) : null}
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
        disabled={customMissing}
      />
      {customMissing ? (
        <Text className="-mt-4 text-center text-xs text-ink-400">
          Descreva seu objetivo para gerar o treino.
        </Text>
      ) : null}

      {saved.length > 0 ? (
        <Section title="Treinos recentes">
          {saved.slice(0, 5).map((workout) => (
            <Pressable
              key={workout.id}
              accessibilityRole="button"
              accessibilityHint="Toque para abrir, segure para apagar"
              onPress={() => setCurrent({ id: workout.id, plan: workout.plan })}
              onLongPress={() =>
                Alert.alert('Apagar treino salvo?', undefined, [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Apagar',
                    style: 'destructive',
                    onPress: () => remove.mutate(workout.id),
                  },
                ])
              }
              className="flex-row items-center gap-3 rounded-[20px] border border-hairline bg-ink-800 p-4 active:opacity-80"
            >
              <RecentIcon />
              <View className="flex-1 gap-0.5">
                <Text className="font-bold text-ink-50">{workout.plan.title}</Text>
                <Text className="text-xs text-ink-400">
                  {workout.plan.totalMinutes} min · {formatRunDate(workout.createdAt)}
                  {workout.feedback ? ` · ${FEEDBACK_LABEL[workout.feedback]}` : ''}
                </Text>
              </View>
              <ChevronIcon />
            </Pressable>
          ))}
        </Section>
      ) : null}
    </View>
  );
}

function RecentIcon() {
  const theme = useThemeColors();
  return (
    <View className="h-10 w-10 items-center justify-center rounded-full bg-ink-700">
      <Ionicons name="document-text-outline" size={18} color={theme.ink[200]} />
    </View>
  );
}

function ChevronIcon() {
  const theme = useThemeColors();
  return <Ionicons name="chevron-forward" size={18} color={theme.ink[400]} />;
}
