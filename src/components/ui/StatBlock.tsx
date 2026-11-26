import { Text, View } from 'react-native';

type StatBlockProps = {
  label: string;
  value: string;
  /** Unit shown smaller next to the value ("km", "/km"). */
  unit?: string;
  size?: 'hero' | 'large' | 'medium';
  align?: 'center' | 'left';
  /** Highlight the value in amber (positive evolution / active). */
  accent?: boolean;
};

const valueSize = {
  hero: 'text-[56px] leading-[60px]',
  large: 'text-[32px] leading-[36px]',
  medium: 'text-[22px] leading-[26px]',
} as const;

/**
 * A labelled metric in "stopwatch" type: JetBrains Mono for both the small uppercase
 * label and the value. Scale: hero 56 · large 32 · medium 22 px.
 */
export function StatBlock({
  label,
  value,
  unit,
  size = 'large',
  align = 'center',
  accent = false,
}: StatBlockProps) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}
      className={`gap-1 ${align === 'center' ? 'items-center' : 'items-start'}`}
    >
      <Text className="font-mono-medium text-[10.5px] uppercase tracking-[1.6px] text-ink-400">
        {label}
      </Text>
      <View className="flex-row items-baseline gap-1">
        <Text
          className={`${valueSize[size]} ${size === 'hero' ? 'font-mono-heavy' : 'font-mono'} ${accent ? 'text-accent' : 'text-ink-50'}`}
          style={{ fontVariant: ['tabular-nums'], flexShrink: 1 }}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>
        {unit ? <Text className="font-mono-medium text-xs text-ink-400">{unit}</Text> : null}
      </View>
    </View>
  );
}
