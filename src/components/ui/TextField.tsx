import { forwardRef } from 'react';
import { Text, TextInput, type TextInputInstance, type TextInputProps, View } from 'react-native';

import { useThemeColors } from '@/theme/theme';

type TextFieldProps = Omit<TextInputProps, 'className'> & {
  label: string;
  error?: string | null;
  hint?: string;
  suffix?: string;
};

export const TextField = forwardRef<TextInputInstance, TextFieldProps>(function TextField(
  { label, error, hint, suffix, ...inputProps },
  ref,
) {
  const theme = useThemeColors();
  const borderClass = error ? 'border-danger' : 'border-hairline focus:border-bolt-500';

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-ink-200">{label}</Text>
      <View
        className={`h-14 flex-row items-center rounded-2xl border bg-ink-800 px-4 ${borderClass}`}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={theme.ink[300]}
          className="flex-1 text-base text-ink-50"
          {...inputProps}
        />
        {suffix ? <Text className="ml-2 text-base text-ink-400">{suffix}</Text> : null}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" className="text-sm text-danger">
          {error}
        </Text>
      ) : hint ? (
        <Text className="text-sm text-ink-400">{hint}</Text>
      ) : null}
    </View>
  );
});
