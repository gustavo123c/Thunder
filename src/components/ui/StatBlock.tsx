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
  large: 'text-[36px] leading-[40px]',
  medium: 'text-[28px] leading-[32px]',
} as const;

/**
 * A labelled metric: small uppercase label, big ExtraBold tabular value — strong
 * contrast between the two, so numbers read at a glance mid-run.
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
      <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-ink-400">
        {label}
      </Text>
      <View className="flex-row items-baseline gap-1">
        <Text
          className={`${valueSize[size]} font-extrabold ${accent ? 'text-accent' : 'text-ink-50'}`}
          style={{ fontVariant: ['tabular-nums'], flexShrink: 1 }}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>
        {unit ? <Text className="text-sm font-semibold text-ink-400">{unit}</Text> : null}
      </View>
    </View>
  );
}
