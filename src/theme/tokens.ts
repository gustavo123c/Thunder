import palette from './palette';

export type ColorSchemeName = 'light' | 'dark';

/** Theme-independent colors. Themed neutrals come from `useThemeColors()`. */
export const colors = {
  /** The single brand amber, #FACC15. */
  brand: palette.brand,
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
  /**
   * Emphasis for text/icons on surfaces: the brand amber in dark mode. In light mode amber
   * is only used as a fill (buttons, pills, tints), so emphasis falls back to primary text.
   */
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
    accent: palette.brand,
    hairline: palette.hairlineDark,
    highlightGradient: ['#182131', '#0F141D', '#0B0F16'],
    bannerGradient: ['#3A3112', '#141B27', '#070A10'],
  },
  light: {
    scheme: 'light',
    isDark: false,
    ink: palette.inkLight,
    accent: palette.inkLight[50],
    hairline: palette.hairlineLight,
    highlightGradient: ['#FFFBEA', '#FFFFFF', '#F8F9FB'],
    bannerGradient: ['#FDE68A', '#FEF3C7', '#F2F4F7'],
  },
};

/** Route line colors used on maps (live tracking and post-run summary). */
export const mapColors = {
  route: palette.brand,
  routeOutline: palette.onBolt,
  start: palette.success,
  finish: palette.danger,
} as const;
