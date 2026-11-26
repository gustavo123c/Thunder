import { useColorScheme, vars } from 'nativewind';

import { type ColorSchemeName, themes, type ThemeColors } from './tokens';

export type ThemePreference = 'system' | 'light' | 'dark';
export const THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];

/** "#0B1220" → "11 18 32" (for `rgb(var(--x) / <alpha-value>)`). */
function rgbChannels(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16);
  return `${(value >> 16) & 255} ${(value >> 8) & 255} ${value & 255}`;
}

function cssVariables(theme: ThemeColors): Record<string, string> {
  const entries: [string, string][] = Object.entries(theme.ink).map(([step, hex]) => [
    `--ink-${step}`,
    rgbChannels(hex),
  ]);
  entries.push(['--accent', rgbChannels(theme.accent)], ['--hairline', theme.hairline]);
  return Object.fromEntries(entries);
}

/** NativeWind style objects that define the themed CSS variables. */
export const themeVariables = {
  dark: vars(cssVariables(themes.dark)),
  light: vars(cssVariables(themes.light)),
} as const;

export function resolveScheme(scheme: string | undefined | null): ColorSchemeName {
  return scheme === 'light' ? 'light' : 'dark';
}

/** Colors for props that cannot use className (icons, SVG, navigation, maps). */
export function useThemeColors(): ThemeColors {
  const { colorScheme } = useColorScheme();
  return themes[resolveScheme(colorScheme)];
}
