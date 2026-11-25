import { Text, View } from 'react-native';

import type { Insight } from '../comparison-copy';

const toneClass: Record<Insight['tone'], string> = {
  record: 'bg-bolt-50 dark:bg-ink-700',
  positive: 'bg-green-50 dark:bg-ink-700',
  neutral: 'bg-ink-100 dark:bg-ink-700',
};

export function InsightsCard({ insights }: { insights: readonly Insight[] }) {
  if (insights.length === 0) return null;

  return (
    <View className="gap-3">
      <Text className="text-lg font-bold text-ink-900 dark:text-ink-50">Sua evolução</Text>
      {insights.map((insight) => (
        <View
          key={insight.text}
          className={`flex-row items-center gap-3 rounded-2xl p-4 ${toneClass[insight.tone]}`}
        >
          <Text className="text-2xl">{insight.emoji}</Text>
          <Text className="flex-1 text-base text-ink-800 dark:text-ink-100">{insight.text}</Text>
        </View>
      ))}
    </View>
  );
}
