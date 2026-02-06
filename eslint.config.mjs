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
      '**/dist/**',
      '.wrangler/**'
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
      'sonarjs/no-duplicate-string': 'off',
      'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }]
    }
  },
  {
    files: ['packages/testing/**/*.js', 'apps/admin-web/src/demo-server.js'],
    rules: {
      'sonarjs/no-hardcoded-passwords': 'off',
      'sonarjs/no-clear-text-protocols': 'off',
      'sonarjs/no-nested-functions': 'off',
      'sonarjs/no-unused-collection': 'off',
      'sonarjs/cognitive-complexity': 'off',
      'sonarjs/no-os-command-from-path': 'off'
    }
  },
  {
    files: ['scripts/**/*.js'],
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
