import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { useThemeColors } from '@/theme/theme';
import { colors, type ThemeColors } from '@/theme/tokens';

import type { Insight } from '../comparison-copy';

const toneStyle = (
  theme: ThemeColors,
): Record<Insight['tone'], { circle: string; icon: string }> => ({
  record: { circle: 'bg-bolt-500', icon: colors.onBolt },
  positive: { circle: 'border border-hairline bg-bolt-500/10', icon: theme.accent },
  neutral: { circle: 'bg-ink-700', icon: theme.ink[300] },
});

export function InsightsCard({ insights }: { insights: readonly Insight[] }) {
  const tones = toneStyle(useThemeColors());
  if (insights.length === 0) return null;

  return (
    <View className="gap-3">
      <Text className="text-lg font-semibold text-ink-50">Sua evolução</Text>
      {insights.map((insight) => (
        <View
          key={insight.text}
          className="flex-row items-center gap-3 rounded-[20px] border border-hairline bg-ink-800 p-4"
        >
          <View
            className={`h-10 w-10 items-center justify-center rounded-full ${tones[insight.tone].circle}`}
          >
            <Ionicons name={insight.icon} size={20} color={tones[insight.tone].icon} />
          </View>
          <Text className="flex-1 text-base text-ink-100">{insight.text}</Text>
        </View>
      ))}
    </View>
  );
}
