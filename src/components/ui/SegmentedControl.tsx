import { Pressable, Text, View } from 'react-native';

type SegmentedControlProps<T extends string | number> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** "radio" for form choices, "tab" for switching views. */
  role?: 'radio' | 'tab';
  accessibilityLabel?: string;
};

/** Compact pill-shaped selector: one row, equal-width segments. */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  role = 'radio',
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  return (
    <View
      accessibilityRole={role === 'radio' ? 'radiogroup' : 'tablist'}
      accessibilityLabel={accessibilityLabel}
      className="flex-row rounded-2xl border border-hairline bg-ink-900 p-1"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole={role}
            accessibilityState={role === 'radio' ? { checked: selected } : { selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            className={`flex-1 items-center rounded-xl py-2.5 ${selected ? 'bg-bolt-500' : 'active:bg-ink-800'}`}
          >
            <Text
              className={`text-sm font-bold ${selected ? 'text-onbolt' : 'text-ink-300'}`}
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
