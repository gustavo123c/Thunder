/**
 * Thunder color palette — single source of truth.
 * Consumed by tailwind.config.js (CommonJS) and by TS code via `@/theme/tokens`.
 *
 * Neutrals (`ink`) are themed: class names such as `bg-ink-800` / `text-ink-50` keep their
 * role in both modes (surface / primary text) and resolve through CSS variables set at the
 * app root (see `src/theme/theme.ts`). The dark scale is the canonical design.
 */
/** The one brand amber (#FACC15): primary buttons, active states, key numbers, the bolt. */
const BRAND = '#FACC15';
const bolt = { 500: BRAND };

/** Role per step: 900 app background · 800 card · 700 raised · 600 strong border ·
 *  500 faint · 400 muted text · 300 secondary text · 100–50 primary text. */
const inkDark = {
  // "Storm" neutrals: blue-tinted night sky.
  50: '#EEF2F7',
  100: '#DCE3EC',
  200: '#C2CCD9',
  300: '#AEB8C6',
  400: '#7A8699',
  500: '#4E5A6B',
  600: '#2A3444',
  700: '#161D29', // raised ("cloud") elements
  800: '#0F141D', // card surface
  900: '#070A10', // app background
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
  brand: BRAND,
  hairlineDark: 'rgba(160, 180, 210, 0.10)',
  hairlineLight: 'rgba(11, 18, 32, 0.09)',
  /** Text/icons on amber backgrounds — the same in both modes. */
  onBolt: '#090C10',
  success: '#22C55E',
  danger: '#EF4444',
  info: '#38BDF8',
};
