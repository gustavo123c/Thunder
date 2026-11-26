import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/theme/theme';

type CardProps = {
  children: ReactNode;
  /** `highlight` adds a subtle dark gradient (streak, main goal). */
  variant?: 'surface' | 'highlight';
  className?: string;
};

/** Performance Dark card: #121721 surface, hairline border, 20 px radius. */
export function Card({ children, variant = 'surface', className = '' }: CardProps) {
  const theme = useThemeColors();
  return (
    <View
      className={`overflow-hidden rounded-[20px] border border-hairline bg-ink-800 p-4 ${className}`}
    >
      {variant === 'highlight' ? (
        <LinearGradient
          colors={theme.highlightGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </View>
  );
}
