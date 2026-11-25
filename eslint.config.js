// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', 'supabase/*', 'src/services/supabase/database.types.ts'],
  },
  {
    // domain/ is pure TypeScript: no framework, platform or app-layer imports.
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-*', 'expo', 'expo-*', '@expo/*', '@supabase/*', '@rnmapbox/*'],
              message: 'src/domain must stay framework-free.',
            },
            {
              group: ['@/*'],
              message: 'src/domain must not depend on other app layers; use relative imports.',
            },
          ],
        },
      ],
    },
  },
]);
