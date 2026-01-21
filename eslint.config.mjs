import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import security from 'eslint-plugin-security';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/*.js',
      '**/*.cjs',
      '**/*.mjs',
      '!eslint.config.mjs',
      '**/coverage/**',
      '**/.nx/**',
      // E2E test support files (Nx generated)
      'apps/api-e2e/src/support/global-*.ts',
      'apps/api-e2e/src/support/test-setup.ts',
    ],
  },

  // Base config for all TypeScript files
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Backend (NestJS) files
  {
    files: ['apps/api/**/*.ts', 'libs/**/*.ts'],
    plugins: {
      import: importPlugin,
      security,
    },
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        project: './tsconfig.base.json',
      },
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.base.json',
        },
      },
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // Console logging
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Import ordering: NestJS → External → @accounting/* → Relative
      'import/order': [
        'warn',
        {
          groups: [
            ['builtin', 'external'],
            ['internal'],
            ['parent', 'sibling', 'index'],
          ],
          pathGroups: [
            {
              pattern: '@nestjs/**',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '@accounting/**',
              group: 'internal',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-duplicates': 'warn',

      // Security rules (warn level for gradual adoption)
      'security/detect-object-injection': 'off', // Too many false positives
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'warn',
      'security/detect-buffer-noassert': 'warn',
      'security/detect-child-process': 'warn',
      'security/detect-disable-mustache-escape': 'warn',
      'security/detect-eval-with-expression': 'warn',
      'security/detect-no-csrf-before-method-override': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'warn',
    },
  },

  // Backend test files - relaxed rules
  {
    files: ['apps/api/**/*.spec.ts', 'apps/api/**/*.test.ts', 'libs/**/*.spec.ts', 'libs/**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
      'security/detect-non-literal-regexp': 'off',
      'security/detect-child-process': 'off',
    },
  },

  // Migrations and seeders - console.log is appropriate for progress feedback
  {
    files: ['apps/api/src/migrations/**/*.ts', 'apps/api/src/seeders/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  // Frontend (React) files
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      import: importPlugin,
      'jsx-a11y': jsxA11y,
    },
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        typescript: {
          project: './apps/web/tsconfig.json',
        },
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      // React Hook Form's watch() API is known to be incompatible with React Compiler memoization
      // This is expected behavior and not a bug - the library handles reactivity internally
      'react-hooks/incompatible-library': 'off',

      // TypeScript rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // Console logging
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Import ordering: React → External → @/* → Relative
      'import/order': [
        'warn',
        {
          groups: [
            ['builtin', 'external'],
            ['internal'],
            ['parent', 'sibling', 'index'],
          ],
          pathGroups: [
            {
              pattern: 'react',
              group: 'external',
              position: 'before',
            },
            {
              pattern: 'react-**',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '@/**',
              group: 'internal',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-duplicates': 'warn',

      // Accessibility rules (warn level for gradual adoption)
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/anchor-has-content': 'warn',
      'jsx-a11y/anchor-is-valid': 'warn',
      'jsx-a11y/aria-activedescendant-has-tabindex': 'warn',
      'jsx-a11y/aria-props': 'warn',
      'jsx-a11y/aria-proptypes': 'warn',
      'jsx-a11y/aria-role': 'warn',
      'jsx-a11y/aria-unsupported-elements': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/heading-has-content': 'warn',
      'jsx-a11y/html-has-lang': 'warn',
      'jsx-a11y/iframe-has-title': 'warn',
      'jsx-a11y/img-redundant-alt': 'warn',
      'jsx-a11y/interactive-supports-focus': 'warn',
      'jsx-a11y/label-has-associated-control': 'warn',
      'jsx-a11y/media-has-caption': 'warn',
      'jsx-a11y/mouse-events-have-key-events': 'warn',
      'jsx-a11y/no-access-key': 'warn',
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/no-distracting-elements': 'warn',
      'jsx-a11y/no-interactive-element-to-noninteractive-role': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
      'jsx-a11y/no-noninteractive-element-to-interactive-role': 'warn',
      'jsx-a11y/no-noninteractive-tabindex': 'warn',
      'jsx-a11y/no-redundant-roles': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/role-has-required-aria-props': 'warn',
      'jsx-a11y/role-supports-aria-props': 'warn',
      'jsx-a11y/scope': 'warn',
      'jsx-a11y/tabindex-no-positive': 'warn',
    },
  },

  // Frontend test files - relaxed rules
  {
    files: ['apps/web/src/**/*.spec.{ts,tsx}', 'apps/web/src/**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
    },
  },

  // E2E test files
  {
    files: ['apps/api-e2e/**/*.ts', 'apps/web-e2e/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': 'off',
    },
  },

  // UI Components - heading wrapper components (shadcn/ui pattern)
  // CardTitle and AlertTitle receive content via children prop spread
  // ESLint can't statically verify content passed through rest props
  {
    files: [
      'apps/web/src/components/ui/card.tsx',
      'apps/web/src/components/ui/alert.tsx',
    ],
    rules: {
      'jsx-a11y/heading-has-content': 'off',
    },
  },

  // Combobox components - intentional autofocus for UX
  // Auto-focusing search input in dropdown is industry-standard pattern
  // (Select2, MUI Autocomplete, Radix Select)
  {
    files: [
      'apps/web/src/components/ui/combobox.tsx',
      'apps/web/src/components/ui/grouped-combobox.tsx',
    ],
    rules: {
      'jsx-a11y/no-autofocus': 'off',
    },
  },

  // Performance utility - dev-only console logging
  // Console output only runs when import.meta.env.DEV is true
  {
    files: ['apps/web/src/lib/utils/performance.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  // Prettier compatibility (must be last)
  prettier
);
