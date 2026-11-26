import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { colors } from '@/theme/tokens';

import type { Insight } from '../comparison-copy';

const toneStyle: Record<Insight['tone'], { circle: string; icon: string }> = {
  record: { circle: 'bg-bolt-500', icon: colors.ink[900] },
  positive: { circle: 'border border-bolt-500/40 bg-bolt-500/10', icon: colors.bolt[500] },
  neutral: { circle: 'bg-ink-700', icon: colors.ink[300] },
};

export function InsightsCard({ insights }: { insights: readonly Insight[] }) {
  if (insights.length === 0) return null;

  return (
    <View className="gap-3">
      <Text className="text-lg font-extrabold text-ink-50">Sua evolução</Text>
      {insights.map((insight) => (
        <View
          key={insight.text}
          className="flex-row items-center gap-3 rounded-[20px] border border-hairline bg-ink-800 p-4"
        >
          <View
            className={`h-10 w-10 items-center justify-center rounded-full ${toneStyle[insight.tone].circle}`}
          >
            <Ionicons name={insight.icon} size={20} color={toneStyle[insight.tone].icon} />
          </View>
          <Text className="flex-1 text-base text-ink-100">{insight.text}</Text>
        </View>
      ))}
    </View>
  );
}
