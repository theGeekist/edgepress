import js from '@eslint/js';
import globals from 'globals';
import sonarjs from 'eslint-plugin-sonarjs';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/coverage/**',
      'gutenberg',
      'gutenberg/**',
      '**/dist/**'
    ]
  },
  js.configs.recommended,
  sonarjs.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.web
      }
    },
    rules: {
      'no-console': 'off',
      'sonarjs/no-duplicate-string': 'off'
    }
  },
  {
    files: ['packages/testing/**/*.js', 'apps/admin-web/src/demo-server.js'],
    rules: {
      'sonarjs/no-hardcoded-passwords': 'off',
      'sonarjs/no-clear-text-protocols': 'off',
      'sonarjs/no-nested-functions': 'off'
    }
  },
  {
    files: ['scripts/**/*.js', 'packages/testing/test/adapters.boundaries.test.js'],
    rules: {
      'sonarjs/no-os-command-from-path': 'off'
    }
  },
  {
    files: ['eslint.config.mjs'],
    rules: {
      'sonarjs/no-hardcoded-passwords': 'off'
    }
  }
];
