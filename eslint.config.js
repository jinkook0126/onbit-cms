import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import { importX } from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores([
    'node_modules/',
    'build/',
    'dist/',
    '.react-router/',
    'coverage/',
    'public/',
    '.agents/',
  ]),

  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  reactHooks.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,

  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      react: { version: 'detect' },
      'import-x/resolver-next': [createTypeScriptImportResolver({ alwaysTryTypes: true })],
    },
    rules: {
      // Core
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'object-shorthand': ['error', 'always'],
      'prefer-template': 'error',
      'no-nested-ternary': 'error',
      'no-param-reassign': ['error', { props: true }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // TypeScript
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/only-throw-error': [
        'error',
        {
          allow: [{ from: 'lib', name: 'Response' }],
          allowThrowingUnknown: false,
          allowThrowingAny: false,
        },
      ],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'forbid',
        },
        {
          selector: 'variable',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
        },
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        { selector: 'import', format: ['camelCase', 'PascalCase'] },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['PascalCase', 'UPPER_CASE'] },
        // 외부 API, HTML 속성, HTTP 헤더 등 형식을 통제할 수 없는 키는 검사하지 않는다.
        {
          selector: ['objectLiteralProperty', 'typeProperty', 'objectLiteralMethod'],
          format: null,
        },
      ],

      // React
      'react/prop-types': 'off',
      'react/function-component-definition': [
        'error',
        { namedComponents: 'function-declaration', unnamedComponents: 'arrow-function' },
      ],
      'react/self-closing-comp': 'error',
      'react/jsx-no-useless-fragment': ['error', { allowExpressions: true }],
      'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never' }],
      'react/jsx-boolean-value': ['error', 'never'],
      'react/jsx-pascal-case': 'error',
      'react/no-array-index-key': 'warn',

      // Import
      'import-x/no-unresolved': 'off',
      'import-x/no-named-as-default-member': 'off',
      'import-x/first': 'error',
      'import-x/newline-after-import': 'error',
      'import-x/no-duplicates': ['error', { 'prefer-inline': false }],
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
          pathGroups: [{ pattern: '~/**', group: 'internal' }],
          'newlines-between': 'always',
          sortTypesGroup: true,
          'newlines-between-types': 'never',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },

  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  // shadcn/ui 컴포넌트는 Props를 ComponentProps로 명시하고 반환 타입은 추론에 맡기는 관례를 따른다.
  {
    files: ['app/components/ui/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },

  eslintConfigPrettier,

  // eslint-config-prettier가 끄는 규칙 중 'all' 옵션은 Prettier와 충돌하지 않는다.
  {
    rules: {
      curly: ['error', 'all'],
    },
  },
);
