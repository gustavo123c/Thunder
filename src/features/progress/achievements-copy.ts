import type Ionicons from '@expo/vector-icons/Ionicons';

import type { Achievement, AchievementId } from '@/domain/insights/records';
import { formatDecimal } from '@/lib/format';

type IconName = keyof typeof Ionicons.glyphMap;

export const ACHIEVEMENT_COPY: Record<
  AchievementId,
  { title: string; description: string; icon: IconName }
> = {
  first_run: {
    title: 'Primeira corrida',
    description: 'Grave sua primeira corrida.',
    icon: 'flag',
  },
  first_5k: { title: 'Primeiros 5 km', description: 'Corra 5 km de uma vez.', icon: 'ribbon' },
  first_10k: { title: 'Primeiros 10 km', description: 'Corra 10 km de uma vez.', icon: 'medal' },
  half_marathon: {
    title: 'Meia maratona',
    description: 'Corra 21,1 km de uma vez.',
    icon: 'trophy',
  },
  days_7: {
    title: 'Consistência: 7 dias',
    description: 'Corra 7 dias seguidos.',
    icon: 'calendar',
  },
  month_12: {
    title: 'Mês imparável',
    description: 'Faça 12 treinos no mesmo mês.',
    icon: 'rocket',
  },
  streak_3: {
    title: '3 semanas seguidas',
    description: 'Treine 3 semanas sem falhar.',
    icon: 'flame',
  },
  streak_8: {
    title: '8 semanas seguidas',
    description: 'Dois meses de constância.',
    icon: 'bonfire',
  },
  runs_10: { title: '10 corridas', description: 'Complete 10 corridas.', icon: 'repeat' },
  km_50: { title: '50 km acumulados', description: 'Some 50 km no total.', icon: 'trail-sign' },
  km_100: { title: '100 km acumulados', description: 'Some 100 km no total.', icon: 'star' },
  km_250: { title: '250 km acumulados', description: 'Some 250 km no total.', icon: 'diamond' },
};

/** "Faltam 2 km para a medalha Primeiros 10 km!" */
export function remainingToMedal(achievement: Achievement, remaining: number): string {
  const title = ACHIEVEMENT_COPY[achievement.id].title;
  switch (achievement.unit) {
    case 'meters_single':
      return `Faltam ${formatDecimal(remaining / 1000)} km na sua maior corrida para a medalha ${title}!`;
    case 'meters_total':
      return `Faltam apenas ${formatDecimal(remaining / 1000)} km para a medalha ${title}!`;
    case 'runs':
      return `Faltam ${remaining} ${remaining === 1 ? 'corrida' : 'corridas'} para a medalha ${title}!`;
    case 'weeks':
      return `Mais ${remaining} ${remaining === 1 ? 'semana' : 'semanas'} de treino para a medalha ${title}!`;
    case 'days':
      return `Mais ${remaining} ${remaining === 1 ? 'dia' : 'dias'} seguidos para a medalha ${title}!`;
    case 'month_runs':
      return `Mais ${remaining} ${remaining === 1 ? 'treino' : 'treinos'} num mês para a medalha ${title}!`;
  }
}
