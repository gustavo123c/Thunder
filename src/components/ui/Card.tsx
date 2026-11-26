import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Polygon } from 'react-native-svg';

import { useThemeColors } from '@/theme/theme';

type CardProps = {
  children: ReactNode;
  /**
   * `highlight` adds a subtle storm gradient (streak, main goal);
   * `bib` cuts the top-right corner like a race bib.
   */
  variant?: 'surface' | 'highlight' | 'bib';
  /** Small mono tag on top of a bib card, e.g. "#12 · Tiros 400 m". */
  tag?: string;
  /** Right side of the tag row (e.g. a "Recorde" badge). */
  tagRight?: ReactNode;
  className?: string;
};

const NOTCH = 22;

/** Race-bib corner: covers the card's top-right corner with the page color + a hairline. */
export function BibNotch() {
  const theme = useThemeColors();
  return (
    <Svg
      width={NOTCH + 2}
      height={NOTCH + 2}
      style={{ position: 'absolute', top: -1, right: -1 }}
      pointerEvents="none"
    >
      <Polygon points={`0,0 ${NOTCH + 2},0 ${NOTCH + 2},${NOTCH + 2}`} fill={theme.ink[900]} />
      <Line x1={1} y1={1} x2={NOTCH + 1} y2={NOTCH + 1} stroke={theme.hairline} strokeWidth={1} />
    </Svg>
  );
}

/** Tag line of a bib card: mono, uppercase, muted. */
export function BibTag({ children }: { children: string }) {
  return (
    <Text
      className="font-mono-medium text-[10.5px] uppercase tracking-[1.6px] text-ink-400"
      numberOfLines={1}
    >
      {children}
    </Text>
  );
}

/** Storm card: #0F141D surface, hairline border, 20 px radius (bib: cut corner). */
export function Card({ children, variant = 'surface', tag, tagRight, className = '' }: CardProps) {
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
      {tag ? (
        <View className="mb-3 flex-row items-center justify-between pr-6">
          <BibTag>{tag}</BibTag>
          {tagRight}
        </View>
      ) : null}
      {children}
      {variant === 'bib' ? <BibNotch /> : null}
    </View>
  );
}
