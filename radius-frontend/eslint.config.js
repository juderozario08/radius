// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['app/**', 'src/**'],
    ignores: ['**/__tests__/**', '**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['app/**', 'src/components/**'],
    ignores: ['app/(auth)/**'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: '@/api/client',
          importNames: ['apiFetch', 'apiFetchSWR'],
          message: 'Screens call the API through callApi from @/utils/helpers.',
        }],
      }],
    },
  },
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', {
        selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
        message: 'Use a color from src/constants/colors.ts.',
      }, {
        selector: 'Literal[value=/^rgba\\(/]',
        message: 'Use a color from src/constants/colors.ts.',
      }],
    },
  },
]);
