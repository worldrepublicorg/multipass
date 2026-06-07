/**
 * ESLint configuration for Multipass.
 * Stricter rules that are noisy for this codebase (crypto bit ops, RN patterns)
 * are warnings so CI stays green while preserving signal in the editor.
 */
const reactNativeConfig = require('@react-native/eslint-config/flat');
const typescriptPlugin = require('@typescript-eslint/eslint-plugin');
const jestPlugin = require('eslint-plugin-jest');

module.exports = [
  {
    ignores: [
      '**/coverage/**',
      '**/android/**',
      '**/ios/**',
      '**/node_modules/**',
      '**/vendor/**',
    ],
  },
  ...reactNativeConfig,
  {
    rules: {
      'no-bitwise': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react/no-unstable-nested-components': 'warn',
      'react-native/no-inline-styles': 'warn',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': typescriptPlugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {argsIgnorePattern: '^_', varsIgnorePattern: '^_'},
      ],
    },
  },
  {
    files: ['jest.setup.js', '__mocks__/**'],
    languageOptions: {
      globals: jestPlugin.environments.globals.globals,
    },
  },
];
