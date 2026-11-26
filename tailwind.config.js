const palette = require('./src/theme/palette');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // 'Performance Dark': the app is always dark (set in src/app/_layout.tsx).
  darkMode: 'class',
  theme: {
    extend: {
      colors: palette,
    },
  },
  plugins: [],
};
