import type { RunnerGoal, RunnerLevel } from '@/domain/types/profile';

type OptionCopy = { title: string; description: string };

export const LEVEL_COPY: Record<RunnerLevel, OptionCopy> = {
  beginner: {
    title: 'Iniciante',
    description: 'Estou começando ou voltando a correr. Quero evoluir sem me lesionar.',
  },
  intermediate: {
    title: 'Intermediário',
    description: 'Já corro com frequência e quero melhorar pace, resistência e recordes.',
  },
};

export const GOAL_COPY: Record<RunnerGoal, OptionCopy> = {
  complete_5k: { title: 'Completar 5 km', description: 'Correr 5 km sem parar.' },
  complete_10k: { title: 'Completar 10 km', description: 'Chegar aos 10 km com conforto.' },
  improve_pace: { title: 'Baixar meu pace', description: 'Correr mais rápido por quilômetro.' },
  increase_endurance: {
    title: 'Ganhar resistência',
    description: 'Correr por mais tempo e distâncias maiores.',
  },
  lose_weight: { title: 'Perder peso', description: 'Usar a corrida para emagrecer com saúde.' },
};
