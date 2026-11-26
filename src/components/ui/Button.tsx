import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

import { useThemeColors } from '@/theme/theme';
import { colors, type ThemeColors } from '@/theme/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** Optional leading icon (Ionicons). */
  icon?: ComponentProps<typeof Ionicons>['name'];
  disabled?: boolean;
  loading?: boolean;
  className?: string;
};

const containerByVariant: Record<ButtonVariant, string> = {
  primary: 'bg-bolt-500 active:bg-bolt-600',
  secondary: 'border border-hairline bg-ink-800 active:bg-ink-700',
  ghost: 'active:bg-ink-800',
};

const labelByVariant: Record<ButtonVariant, string> = {
  primary: 'text-onbolt',
  secondary: 'text-ink-50',
  ghost: 'text-ink-300',
};

function iconColorFor(variant: ButtonVariant, theme: ThemeColors): string {
  if (variant === 'primary') return colors.onBolt;
  return variant === 'secondary' ? theme.ink[50] : theme.ink[300];
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  className = '',
}: ButtonProps) {
  const theme = useThemeColors();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      className={`h-14 flex-row items-center justify-center gap-2 rounded-2xl px-6 ${containerByVariant[variant]} ${isDisabled ? 'opacity-50' : ''} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.onBolt : theme.accent} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={iconColorFor(variant, theme)} /> : null}
          <Text className={`text-base font-bold ${labelByVariant[variant]}`}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
