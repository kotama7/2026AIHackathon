---
id: P0-07
title: ESLint / Prettier / Husky セットアップ
assignee: both
estimate_hours: 1
phase: 0
depends_on: [P0-02]
labels: [infra, ci]
---

## 概要

全パッケージ共通の lint / format / pre-commit hook を設定する。

## 受け入れ条件

- [ ] ルートに `.eslintrc.cjs` (または `eslint.config.js` flat config) と `.prettierrc.json`
- [ ] `apps/web` は Next.js デフォルトの ESLint を継承
- [ ] `functions/` は TS + Node 向け ESLint
- [ ] Husky + lint-staged で pre-commit に lint + format
- [ ] `pnpm lint` / `pnpm format` がルートから動く
- [ ] エディタ設定: `.vscode/settings.json` で format on save

## 実装メモ

- TypeScript 5.x + `@typescript-eslint/*` を採用
- import 順整理: `eslint-plugin-import` か `eslint-plugin-simple-import-sort`
