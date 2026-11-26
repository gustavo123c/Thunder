import type { ReactNode } from 'react';
import { Text } from 'react-native';

/**
 * "Pista" type: numbers in JetBrains Mono (StatBlock, `font-mono`), screen titles in
 * Archivo Expanded (`font-display`), labels in JetBrains Mono Medium uppercase, body text
 * in the system font (card titles 600, body 400).
 */

type TextProps = { children: ReactNode; className?: string };

/** Screen title — Archivo Expanded 28 px. */
export function ScreenTitle({ children, className = '' }: TextProps) {
  return (
    <Text
      accessibilityRole="header"
      className={`font-display text-[28px] text-ink-50 ${className}`}
    >
      {children}
    </Text>
  );
}

/** Card / section title — 16 px, semibold. */
export function CardTitle({ children, className = '' }: TextProps) {
  return <Text className={`text-base font-semibold text-ink-50 ${className}`}>{children}</Text>;
}

/** Small uppercase label above values and sections — mono 10.5 px, muted. */
export function Label({ children, className = '' }: TextProps) {
  return (
    <Text
      className={`font-mono-medium text-[10.5px] uppercase tracking-[1.6px] text-ink-400 ${className}`}
    >
      {children}
    </Text>
  );
}
