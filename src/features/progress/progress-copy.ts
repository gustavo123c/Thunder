import type { Period, PeriodComparison, WinStreak } from '@/domain/insights/activity';

export const PERIOD_LABELS: Record<Period, string> = {
  day: 'Dia',
  week: 'Semana',
  month: 'Mês',
  year: 'Ano',
};

const PREVIOUS_LABEL: Record<Period, string> = {
  day: 'ontem',
  week: 'na semana passada',
  month: 'no mês passado',
  year: 'no ano passado',
};

/** "em relação a/à/ao …" */
const RELATIVE_LABEL: Record<Period, string> = {
  day: 'a ontem',
  week: 'à semana passada',
  month: 'ao mês passado',
  year: 'ao ano passado',
};

const CURRENT_LABEL: Record<Period, string> = {
  day: 'hoje',
  week: 'nesta semana',
  month: 'neste mês',
  year: 'neste ano',
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "3 treinos esta semana | 12 no mês" */
export function describeStreakCounts(streak: WinStreak): string {
  return `${plural(streak.runsThisWeek, 'treino', 'treinos')} esta semana | ${streak.runsThisMonth} no mês`;
}

export function describeWeekStreak(streak: WinStreak): string {
  if (streak.weekStreak === 0) return 'Corra esta semana para começar uma sequência!';
  if (streak.weekStreak === 1) return '1 semana ativa — continue assim!';
  return `${streak.weekStreak} semanas seguidas treinando`;
}

/** Formats a signed percentage: 12 → "+12%", -3.5 → "-3,5%". */
export function formatPercent(value: number): string {
  const text = Math.abs(value)
    .toFixed(Number.isInteger(value) ? 0 : 1)
    .replace('.', ',');
  return `${value > 0 ? '+' : value < 0 ? '-' : ''}${text}%`;
}

export type ProgressMessage = { text: string; tone: 'positive' | 'negative' | 'neutral' };

/** Main dashboard message, based on pace (performance) or, without pace, on activity. */
export function describeProgress(comparison: PeriodComparison): ProgressMessage {
  const { period, current, previous, paceImprovementPct, distanceChangePct } = comparison;

  if (current.runs === 0) {
    return {
      text: `Nenhuma corrida ${CURRENT_LABEL[period]} ainda. Bora mudar isso?`,
      tone: 'neutral',
    };
  }

  if (paceImprovementPct !== null) {
    if (paceImprovementPct >= 1) {
      return {
        text: `Você melhorou ${formatPercent(paceImprovementPct).slice(1)} no seu pace de corrida em relação ${RELATIVE_LABEL[period]}.`,
        tone: 'positive',
      };
    }
    if (paceImprovementPct <= -1) {
      return {
        text: `Seu pace ficou ${formatPercent(paceImprovementPct).slice(1)} mais lento que ${PREVIOUS_LABEL[period]}. Fases mais leves fazem parte da evolução.`,
        tone: 'negative',
      };
    }
    return {
      text: `Pace estável em relação ${RELATIVE_LABEL[period]}. Consistência é tudo!`,
      tone: 'neutral',
    };
  }

  if (previous.runs === 0) {
    return {
      text: `${plural(current.runs, 'corrida', 'corridas')} ${CURRENT_LABEL[period]} — sem corridas ${PREVIOUS_LABEL[period]} para comparar.`,
      tone: 'positive',
    };
  }

  if (distanceChangePct !== null && distanceChangePct > 0) {
    return {
      text: `Você correu ${formatPercent(distanceChangePct).slice(1)} mais distância que ${PREVIOUS_LABEL[period]}.`,
      tone: 'positive',
    };
  }

  return { text: 'Continue registrando suas corridas para ver sua evolução.', tone: 'neutral' };
}
