import type Ionicons from '@expo/vector-icons/Ionicons';

import type { AchievementId } from '@/domain/insights/records';

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
  streak_3: {
    title: '3 semanas seguidas',
    description: 'Treine 3 semanas sem falhar.',
    icon: 'flame',
  },
  runs_10: { title: '10 corridas', description: 'Complete 10 corridas.', icon: 'repeat' },
  km_50: { title: '50 km acumulados', description: 'Some 50 km no total.', icon: 'trail-sign' },
  first_10k: { title: 'Primeiros 10 km', description: 'Corra 10 km de uma vez.', icon: 'medal' },
  streak_8: {
    title: '8 semanas seguidas',
    description: 'Dois meses de constância.',
    icon: 'bonfire',
  },
  km_100: { title: '100 km acumulados', description: 'Some 100 km no total.', icon: 'trophy' },
  km_250: { title: '250 km acumulados', description: 'Some 250 km no total.', icon: 'diamond' },
};
