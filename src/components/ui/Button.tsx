import { ActivityIndicator, Pressable, Text } from 'react-native';

import { colors } from '@/theme/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
};

const containerByVariant: Record<ButtonVariant, string> = {
  primary: 'bg-bolt-500 active:bg-bolt-600',
  secondary: 'border border-ink-200 bg-white active:bg-ink-100 dark:border-ink-600 dark:bg-ink-800',
  ghost: 'active:bg-ink-100 dark:active:bg-ink-800',
};

const labelByVariant: Record<ButtonVariant, string> = {
  primary: 'text-ink-900',
  secondary: 'text-ink-900 dark:text-ink-50',
  ghost: 'text-ink-600 dark:text-ink-200',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  className = '',
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      className={`h-14 flex-row items-center justify-center rounded-2xl px-6 ${containerByVariant[variant]} ${isDisabled ? 'opacity-50' : ''} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.ink[900] : colors.bolt[500]} />
      ) : (
        <Text className={`text-base font-semibold ${labelByVariant[variant]}`}>{label}</Text>
      )}
    </Pressable>
  );
}
