// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  // 全ファイル共通の ignore
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/lib/**',
      '**/.next/**',
      '**/out/**',
      '**/build/**',
      '**/*.d.ts',
      'apps/web/next-env.d.ts',
      'pnpm-lock.yaml',
    ],
  },

  // ESLint 推奨 + TS 推奨
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 全 TS/TSX 共通ルール
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // .mjs スクリプト (sync-tasks など) は Node globals を許可
  {
    files: ['scripts/**/*.{js,mjs}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
    },
  },

  // Prettier との衝突回避 (最後に置く)
  eslintConfigPrettier,
];
