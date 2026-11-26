import palette from './palette';

export type ColorSchemeName = 'light' | 'dark';

/** Theme-independent colors. Themed neutrals come from `useThemeColors()`. */
export const colors = {
  bolt: palette.bolt,
  onBolt: palette.onBolt,
  success: palette.success,
  danger: palette.danger,
  info: palette.info,
} as const;

export type ThemeColors = {
  scheme: ColorSchemeName;
  isDark: boolean;
  ink: typeof palette.inkDark;
  /** Amber for text/icons on surfaces. */
  accent: string;
  hairline: string;
  /** Subtle gradient for highlight cards (streak, main goal). */
  highlightGradient: readonly [string, string, string];
  /** Profile cover. */
  bannerGradient: readonly [string, string, string];
};

export const themes: Record<ColorSchemeName, ThemeColors> = {
  dark: {
    scheme: 'dark',
    isDark: true,
    ink: palette.inkDark,
    accent: palette.accentDark,
    hairline: palette.hairlineDark,
    highlightGradient: ['#1D2535', '#121721', '#0E131B'],
    bannerGradient: ['#3A3112', '#1A1F2B', '#090C10'],
  },
  light: {
    scheme: 'light',
    isDark: false,
    ink: palette.inkLight,
    accent: palette.accentLight,
    hairline: palette.hairlineLight,
    highlightGradient: ['#FFFBEA', '#FFFFFF', '#F8F9FB'],
    bannerGradient: ['#FDE68A', '#FEF3C7', '#F2F4F7'],
  },
};

/** Route line colors used on maps (live tracking and post-run summary). */
export const mapColors = {
  route: palette.bolt[500],
  routeOutline: palette.onBolt,
  start: palette.success,
  finish: palette.danger,
} as const;
