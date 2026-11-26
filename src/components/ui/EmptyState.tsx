import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useThemeColors } from '@/theme/theme';

type EmptyStateProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  description?: string;
  action?: ReactNode;
  /** Smaller variant for inline sections. */
  compact?: boolean;
};

/** Minimal empty state: icon inside a dashed ring with a soft glow. */
export function EmptyState({ icon, title, description, action, compact = false }: EmptyStateProps) {
  const theme = useThemeColors();
  const ring = compact ? 64 : 104;
  return (
    <View className={`items-center ${compact ? 'gap-3 py-6' : 'gap-5 py-14'}`}>
      <View
        className="items-center justify-center rounded-full bg-bolt-500/5"
        style={{ width: ring + 24, height: ring + 24 }}
      >
        <View
          className="items-center justify-center rounded-full border border-dashed border-bolt-500/40 bg-ink-800"
          style={{ width: ring, height: ring }}
        >
          <Ionicons name={icon} size={compact ? 26 : 40} color={theme.accent} />
        </View>
      </View>
      <View className="items-center gap-1.5 px-6">
        <Text className="text-center text-lg font-bold text-ink-50">{title}</Text>
        {description ? (
          <Text className="text-center text-sm leading-5 text-ink-300">{description}</Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}
