import js from '@eslint/js';
import globals from 'globals';
import sonarjs from 'eslint-plugin-sonarjs';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

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
    files: ['**/*.js', '**/*.mjs', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.node,
        ...globals.web
      }
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.base.json'
        },
        node: true
      }
    },
    rules: {
      'no-console': 'off',
      'sonarjs/no-duplicate-string': 'off',
      'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['@geekist/edgepress/*/src/*'],
            message: 'Import from package public exports only; do not import /src internals.'
          },
          {
            group: ['@geekist/edgepress/cap-*/*'],
            message: 'Import capability packages via their root public surface only.'
          }
        ]
      }],
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }]
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
  },
  {
    files: ['apps/admin-web/src/**/*.jsx', 'apps/admin-web/src/**/*.js'],
    settings: {
      react: {
        version: '18.3.1'
      }
    },
    plugins: {
      react,
      'react-hooks': reactHooks
    },
    rules: {
      'react/prop-types': 'off',
      'react/jsx-uses-vars': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error'
    }
  }
];
