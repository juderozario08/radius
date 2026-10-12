// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
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
]);
