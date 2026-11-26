const palette = require('./src/theme/palette');

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // Light/dark is applied through CSS variables at the root (src/theme/theme.ts).
  darkMode: 'class',
  theme: {
    extend: {
      // "Pista" type: stopwatch numbers, wide titles. Names match the fonts loaded in
      // src/theme/fonts.ts. With a custom family, don't add font-bold/extrabold classes.
      fontFamily: {
        mono: ['JetBrainsMono_700Bold'],
        'mono-medium': ['JetBrainsMono_500Medium'],
        'mono-heavy': ['JetBrainsMono_800ExtraBold'],
        display: ['ArchivoExpanded_700Bold'],
      },
      colors: {
        bolt: palette.bolt,
        ink: Object.fromEntries(
          STEPS.map((step) => [step, `rgb(var(--ink-${step}) / <alpha-value>)`]),
        ),
        accent: 'rgb(var(--accent) / <alpha-value>)',
        hairline: 'var(--hairline)',
        onbolt: palette.onBolt,
        success: palette.success,
        danger: palette.danger,
        info: palette.info,
      },
    },
  },
  plugins: [],
};
