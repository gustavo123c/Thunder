import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/theme/theme';
import { colors } from '@/theme/tokens';

import type { WorkoutFeedback } from '../api/workouts.api';
import { useWorkoutFeedback } from '../hooks/useWorkouts';

type IconName = keyof typeof Ionicons.glyphMap;

const OPTIONS: readonly { value: WorkoutFeedback; label: string; icon: IconName }[] = [
  { value: 'helped', label: 'Ajudou muito', icon: 'happy-outline' },
  { value: 'neutral', label: 'Neutro', icon: 'remove-circle-outline' },
  { value: 'discomfort', label: 'Ainda sinto desconforto', icon: 'sad-outline' },
];

const THANKS: Record<WorkoutFeedback, string> = {
  helped: 'Ótimo! Vamos sugerir esse treino de novo se a dor voltar.',
  neutral: 'Anotado. Seguimos acompanhando sua evolução.',
  discomfort: 'Anotado. O próximo treino para essa região terá uma carga menor.',
};

type WorkoutCheckInProps = {
  userId: string;
  workoutId: string;
  runId: string | null;
  onAnswered?: (feedback: WorkoutFeedback) => void;
};

/** "Como você se sentiu com esse treino?" — feeds the next pain-adapted workouts. */
export function WorkoutCheckIn({ userId, workoutId, runId, onAnswered }: WorkoutCheckInProps) {
  const theme = useThemeColors();
  const save = useWorkoutFeedback(userId);
  const [answer, setAnswer] = useState<WorkoutFeedback | null>(null);

  function choose(value: WorkoutFeedback) {
    setAnswer(value);
    save.mutate({ workoutId, feedback: value, runId }, { onSuccess: () => onAnswered?.(value) });
  }

  return (
    <View className="gap-3 rounded-[20px] border border-hairline bg-ink-800 p-4">
      <Text accessibilityRole="header" className="text-base font-extrabold text-ink-50">
        Como você se sentiu com esse treino?
      </Text>
      <View accessibilityRole="radiogroup" className="gap-2">
        {OPTIONS.map((option) => {
          const selected = answer === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: save.isPending }}
              accessibilityLabel={option.label}
              disabled={save.isPending || (answer !== null && save.isSuccess)}
              onPress={() => choose(option.value)}
              className={`flex-row items-center gap-3 rounded-2xl border px-3 py-3 active:opacity-80 ${
                selected ? 'border-bolt-500 bg-bolt-500/10' : 'border-hairline bg-ink-900'
              }`}
            >
              <Ionicons
                name={option.icon}
                size={20}
                color={selected ? theme.accent : theme.ink[300]}
              />
              <Text className="flex-1 text-sm font-semibold text-ink-100">{option.label}</Text>
              {selected && save.isSuccess ? (
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {answer && save.isSuccess ? (
        <Text accessibilityLiveRegion="polite" className="text-xs leading-4 text-ink-300">
          {THANKS[answer]}
        </Text>
      ) : null}
      {save.isError ? (
        <Text className="text-xs text-danger">Não foi possível salvar. Toque de novo.</Text>
      ) : null}
    </View>
  );
}
