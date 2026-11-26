import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import type { RunStatus } from '@/domain/run-session/run-session';
import { useThemeColors } from '@/theme/theme';
import { colors } from '@/theme/tokens';

type RoundButtonProps = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  tone: 'primary' | 'dark' | 'danger';
  size?: 'large' | 'medium';
  loading?: boolean;
  disabled?: boolean;
};

const toneClass = {
  primary: 'bg-bolt-500 active:bg-bolt-600',
  dark: 'bg-ink-700 active:bg-ink-600',
  danger: 'bg-danger active:opacity-80',
} as const;

function RoundButton({
  label,
  icon,
  onPress,
  tone,
  size = 'large',
  loading,
  disabled,
}: RoundButtonProps) {
  const theme = useThemeColors();
  const dimension = size === 'large' ? 'h-24 w-24' : 'h-20 w-20';
  const iconColor = tone === 'primary' ? colors.onBolt : theme.ink[50];
  return (
    <View className="items-center gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
        disabled={disabled || loading}
        onPress={onPress}
        className={`${dimension} items-center justify-center rounded-full ${toneClass[tone]} ${disabled ? 'opacity-50' : ''}`}
      >
        {loading ? (
          <ActivityIndicator color={iconColor} />
        ) : (
          <Ionicons name={icon} size={size === 'large' ? 40 : 32} color={iconColor} />
        )}
      </Pressable>
      <Text className="text-sm font-semibold text-ink-200">{label}</Text>
    </View>
  );
}

type RunControlsProps = {
  status: RunStatus | null;
  pending: string | null;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
};

export function RunControls({
  status,
  pending,
  onStart,
  onPause,
  onResume,
  onFinish,
}: RunControlsProps) {
  const busy = pending !== null;

  if (status === null || status === 'finished') {
    return (
      <View className="items-center">
        <RoundButton
          label="Iniciar"
          icon="play"
          tone="primary"
          onPress={onStart}
          loading={pending === 'start'}
          disabled={busy}
        />
      </View>
    );
  }

  if (status === 'running') {
    return (
      <View className="items-center">
        <RoundButton
          label="Pausar"
          icon="pause"
          tone="dark"
          onPress={onPause}
          loading={pending === 'pause'}
          disabled={busy}
        />
      </View>
    );
  }

  return (
    <View className="flex-row items-center justify-center gap-10">
      <RoundButton
        label="Retomar"
        icon="play"
        tone="primary"
        size="medium"
        onPress={onResume}
        loading={pending === 'resume'}
        disabled={busy}
      />
      <RoundButton
        label="Finalizar"
        icon="stop"
        tone="danger"
        size="medium"
        onPress={onFinish}
        loading={pending === 'finish' || pending === 'discard'}
        disabled={busy}
      />
    </View>
  );
}
