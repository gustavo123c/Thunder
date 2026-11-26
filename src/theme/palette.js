/**
 * Thunder color palette — single source of truth.
 * Consumed by tailwind.config.js (CommonJS) and by TS code via `@/theme/tokens`.
 *
 * Neutrals (`ink`) are themed: class names such as `bg-ink-800` / `text-ink-50` keep their
 * role in both modes (surface / primary text) and resolve through CSS variables set at the
 * app root (see `src/theme/theme.ts`). The dark scale is the canonical design.
 */
const bolt = {
  50: '#FEFCE8',
  100: '#FEF9C3',
  200: '#FEF08A',
  300: '#FDE047',
  400: '#FDE047',
  500: '#FACC15',
  600: '#EAB308',
  700: '#CA8A04',
  800: '#854D0E',
  900: '#422006',
};

/** Role per step: 900 app background · 800 card · 700 raised · 600 strong border ·
 *  500 faint · 400 muted text · 300 secondary text · 100–50 primary text. */
const inkDark = {
  50: '#F5F7FA',
  100: '#E6EAF0',
  200: '#C9D1DC',
  300: '#9AA6B6',
  400: '#6B7889',
  500: '#4A5667',
  600: '#333D4B',
  700: '#1C2331',
  800: '#121721',
  900: '#090C10',
};

const inkLight = {
  50: '#0B1220',
  100: '#1B2433',
  200: '#2E3A4D',
  300: '#4B5668',
  400: '#667183',
  500: '#8C96A5',
  600: '#C3CAD4',
  700: '#E9EDF2',
  800: '#FFFFFF',
  900: '#F2F4F7',
};

module.exports = {
  bolt,
  inkDark,
  inkLight,
  /** Amber used as text/icon color on surfaces (darker in light mode for contrast). */
  accentDark: '#FACC15',
  accentLight: '#A16207',
  hairlineDark: 'rgba(255, 255, 255, 0.08)',
  hairlineLight: 'rgba(11, 18, 32, 0.09)',
  /** Text/icons on amber backgrounds — the same in both modes. */
  onBolt: '#090C10',
  success: '#22C55E',
  danger: '#EF4444',
  info: '#38BDF8',
};
