import { Text, View } from 'react-native';

type StatBlockProps = {
  label: string;
  value: string;
  size?: 'hero' | 'large' | 'medium';
  align?: 'center' | 'left';
};

const valueSize = {
  hero: 'text-6xl font-black',
  large: 'text-3xl font-bold',
  medium: 'text-xl font-bold',
} as const;

/** A labelled metric. Uses tabular digits so numbers don't jitter as they change. */
export function StatBlock({ label, value, size = 'large', align = 'center' }: StatBlockProps) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      className={`gap-0.5 ${align === 'center' ? 'items-center' : 'items-start'}`}
    >
      <Text
        className={`${valueSize[size]} text-ink-900 dark:text-ink-50`}
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {value}
      </Text>
      <Text className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</Text>
    </View>
  );
}
