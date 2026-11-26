import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useThemeColors } from '@/theme/theme';

import { RouteIllustration } from './RouteIllustration';

type EmptyStateProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  /** 'route' replaces the icon with the map-grid route illustration (big empty screens). */
  illustration?: 'route';
  title: string;
  description?: string;
  action?: ReactNode;
  /** Smaller variant for inline sections. */
  compact?: boolean;
};

/** Minimal empty state: icon inside a dashed ring with a soft glow. */
export function EmptyState({
  icon,
  illustration,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  const theme = useThemeColors();
  const ring = compact ? 64 : 104;
  return (
    <View className={`items-center ${compact ? 'gap-3 py-6' : 'gap-5 py-12'}`}>
      {illustration === 'route' ? (
        <View className="overflow-hidden rounded-3xl border border-hairline bg-ink-800">
          <RouteIllustration width={220} />
        </View>
      ) : (
        <View
          className="items-center justify-center rounded-full bg-bolt-500/5"
          style={{ width: ring + 24, height: ring + 24 }}
        >
          <View
            className="items-center justify-center rounded-full border border-dashed border-hairline bg-ink-800"
            style={{ width: ring, height: ring }}
          >
            <Ionicons name={icon} size={compact ? 26 : 40} color={theme.accent} />
          </View>
        </View>
      )}
      <View className="items-center gap-1.5 px-6">
        <Text className="text-center text-lg font-semibold text-ink-50">{title}</Text>
        {description ? (
          <Text className="max-w-[300px] text-center text-[15px] leading-[21px] text-ink-300">
            {description}
          </Text>
        ) : null}
      </View>
      {action ? <View className="w-full max-w-[340px] gap-3 px-2">{action}</View> : null}
    </View>
  );
}
