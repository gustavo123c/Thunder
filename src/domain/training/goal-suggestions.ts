import type { RunnerGoal } from '../types/profile';

import type { RunWorkoutType, TrainingLevel, WorkoutDuration } from './workout-generator';

export type GoalSuggestion = {
  type: RunWorkoutType;
  durationMin: WorkoutDuration;
  /** Why this session serves the goal (pt-BR). */
  reason: string;
};

type Template = {
  type: RunWorkoutType;
  /** Duration per level: beginner, intermediate, advanced. */
  durations: readonly [WorkoutDuration, WorkoutDuration, WorkoutDuration];
  reason: string;
  /** Beginners get this type instead (e.g. no VO2max intervals at the start). */
  beginnerType?: RunWorkoutType;
};

const LEVEL_INDEX: Record<TrainingLevel, 0 | 1 | 2> = { beginner: 0, intermediate: 1, advanced: 2 };

const TEMPLATES: Record<RunnerGoal, readonly Template[]> = {
  complete_5k: [
    {
      type: 'easy',
      durations: [20, 30, 30],
      reason: 'Base aeróbica para sustentar 5 km sem parar.',
    },
    {
      type: 'fartlek',
      durations: [20, 30, 30],
      reason: 'Variações curtas de ritmo, sem pressão de pace.',
    },
    {
      type: 'progressive',
      durations: [30, 30, 45],
      reason: 'Ensina a terminar mais forte do que começou.',
      beginnerType: 'easy',
    },
  ],
  complete_10k: [
    {
      type: 'long',
      durations: [60, 60, 90],
      reason: 'Aumenta o tempo em pé, o principal limite nos 10 km.',
    },
    {
      type: 'tempo',
      durations: [30, 45, 45],
      reason: 'Ritmo de limiar para segurar o pace na segunda metade.',
      beginnerType: 'fartlek',
    },
    {
      type: 'easy',
      durations: [30, 45, 45],
      reason: 'Volume leve entre os treinos mais exigentes.',
    },
  ],
  improve_pace: [
    {
      type: 'intervals',
      durations: [30, 45, 45],
      reason: 'Tiros elevam o VO2máx e a velocidade máxima.',
      beginnerType: 'fartlek',
    },
    {
      type: 'tempo',
      durations: [30, 45, 60],
      reason: 'Limiar mais alto = pace mais rápido por mais tempo.',
    },
    {
      type: 'hills',
      durations: [30, 45, 45],
      reason: 'Força nas pernas que vira velocidade no plano.',
    },
  ],
  increase_endurance: [
    {
      type: 'long',
      durations: [60, 90, 90],
      reason: 'O longão é o treino central da resistência.',
    },
    {
      type: 'easy',
      durations: [30, 45, 60],
      reason: 'Mais volume em ritmo confortável, com pouco desgaste.',
    },
    {
      type: 'progressive',
      durations: [45, 45, 60],
      reason: 'Resistência com um final em ritmo mais firme.',
      beginnerType: 'easy',
    },
  ],
  lose_weight: [
    {
      type: 'easy',
      durations: [30, 45, 60],
      reason: 'Ritmo sustentável por mais tempo gasta mais energia no total.',
    },
    {
      type: 'fartlek',
      durations: [30, 30, 45],
      reason: 'Alternância de ritmo, mais gasto em menos tempo.',
    },
    {
      type: 'long',
      durations: [60, 60, 90],
      reason: 'Sessão longa e leve uma vez por semana.',
    },
  ],
};

/** Three sessions suited to the runner's goal, adjusted to the level. */
export function suggestionsForGoal(goal: RunnerGoal, level: TrainingLevel): GoalSuggestion[] {
  const index = LEVEL_INDEX[level];
  const seen = new Set<RunWorkoutType>();
  return TEMPLATES[goal].flatMap((t) => {
    const type = level === 'beginner' && t.beginnerType ? t.beginnerType : t.type;
    if (seen.has(type)) return [];
    seen.add(type);
    return [{ type, durationMin: t.durations[index], reason: t.reason }];
  });
}
