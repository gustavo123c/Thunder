import type { ReactNode } from 'react';
import { Text } from 'react-native';

/**
 * Type scale. Numbers use StatBlock / tabular ExtraBold (800); everything else is lighter:
 * screen titles 700 · card and section titles 600 · body 400 · labels 500 uppercase.
 */

type TextProps = { children: ReactNode; className?: string };

/** Screen title — 28 px, bold. */
export function ScreenTitle({ children, className = '' }: TextProps) {
  return (
    <Text accessibilityRole="header" className={`text-[28px] font-bold text-ink-50 ${className}`}>
      {children}
    </Text>
  );
}

/** Card / section title — 16 px, semibold. */
export function CardTitle({ children, className = '' }: TextProps) {
  return <Text className={`text-base font-semibold text-ink-50 ${className}`}>{children}</Text>;
}

/** Small uppercase label above values and sections — 11 px, medium, muted. */
export function Label({ children, className = '' }: TextProps) {
  return (
    <Text
      className={`text-[11px] font-medium uppercase tracking-[1.5px] text-ink-400 ${className}`}
    >
      {children}
    </Text>
  );
}
