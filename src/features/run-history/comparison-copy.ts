import type { RunComparison } from '@/domain/insights/comparison';
import { formatPaceDelta, formatShortDistance } from '@/lib/format';

/** Ionicons names used by the insights. */
export type InsightIcon =
  | 'flash'
  | 'trophy'
  | 'rocket'
  | 'flame'
  | 'locate'
  | 'trending-up'
  | 'leaf'
  | 'add-circle'
  | 'remove-circle';

export type Insight = { icon: InsightIcon; text: string; tone: 'record' | 'positive' | 'neutral' };

/** Turns a comparison into short, encouraging Portuguese insights, most important first. */
export function describeComparison(comparison: RunComparison): Insight[] {
  if (comparison.isFirstRun) {
    return [
      {
        icon: 'flash',
        text: 'Primeira corrida registrada! As próximas serão comparadas com esta.',
        tone: 'record',
      },
    ];
  }

  const insights: Insight[] = [];
  const { records, similar, previous } = comparison;

  if (records.longestRun) {
    insights.push({ icon: 'trophy', text: 'Sua corrida mais longa até agora!', tone: 'record' });
  }
  if (records.fastestKm) {
    insights.push({
      icon: 'rocket',
      text: 'Novo recorde: seu quilômetro mais rápido.',
      tone: 'record',
    });
  }
  if (records.fastestPaceForDistance) {
    insights.push({
      icon: 'flame',
      text: 'Seu melhor pace médio para esta distância.',
      tone: 'record',
    });
  }

  if (similar) {
    const runsLabel =
      similar.count === 1 ? '1 corrida parecida' : `${similar.count} corridas parecidas`;
    insights.push(
      similar.trend === 'same'
        ? { icon: 'locate', text: `Pace consistente com suas ${runsLabel}.`, tone: 'neutral' }
        : {
            icon: similar.trend === 'faster' ? 'trending-up' : 'leaf',
            text: `${formatPaceDelta(similar.paceDeltaSPerKm)} que a média de ${runsLabel}.`,
            tone: similar.trend === 'faster' ? 'positive' : 'neutral',
          },
    );
  }

  if (previous && Math.abs(previous.distanceDeltaM) >= 100) {
    const more = previous.distanceDeltaM > 0;
    insights.push({
      icon: more ? 'add-circle' : 'remove-circle',
      text: `${formatShortDistance(Math.abs(previous.distanceDeltaM))} ${more ? 'a mais' : 'a menos'} que a corrida anterior.`,
      tone: more ? 'positive' : 'neutral',
    });
  }

  return insights;
}
