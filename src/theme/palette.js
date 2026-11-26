/**
 * Thunder color palette — single source of truth.
 * Consumed by tailwind.config.js (CommonJS) and by TS code via `@/theme/tokens`
 * (for places that cannot use className, e.g. Mapbox layer styles).
 */
module.exports = {
  // Amber — primary actions, active states and positive evolution only.
  bolt: {
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
  },
  ink: {
    50: '#F5F7FA',
    100: '#E6EAF0',
    200: '#C9D1DC',
    300: '#9AA6B6',
    400: '#6B7889',
    500: '#4A5667',
    600: '#333D4B',
    700: '#1C2331', // raised elements inside cards
    800: '#121721', // card surface
    900: '#090C10', // app background
  },
  /** Hairline border for cards on the dark background. */
  hairline: 'rgba(255, 255, 255, 0.08)',
  success: '#22C55E',
  danger: '#EF4444',
  info: '#38BDF8',
};
