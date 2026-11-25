/**
 * Thunder color palette — single source of truth.
 * Consumed by tailwind.config.js (CommonJS) and by TS code via `@/theme/tokens`
 * (for places that cannot use className, e.g. Mapbox layer styles).
 */
module.exports = {
  bolt: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F5B400',
    600: '#D99A00',
    700: '#A86F00',
    800: '#7A5000',
    900: '#4D3200',
  },
  ink: {
    50: '#F5F7FA',
    100: '#E6EAF0',
    200: '#C9D1DC',
    300: '#9AA6B6',
    400: '#6B7889',
    500: '#4A5667',
    600: '#333D4B',
    700: '#222A35',
    800: '#151B23',
    900: '#0B0F14',
  },
  success: '#22C55E',
  danger: '#EF4444',
  info: '#38BDF8',
};
