---
id: P0-02
title: pnpm monorepo セットアップ
assignee: both
estimate_hours: 2
phase: 0
depends_on: []
labels: [infra]
---

## 概要
pnpm workspaces で `apps/web` (Next.js)、`functions` (Cloud Functions)、`packages/shared` (型・schema・contracts) の 3 パッケージを scaffold する。

## 受け入れ条件
- [ ] ルートに `pnpm-workspace.yaml` と `package.json` が存在
- [ ] `apps/web/` が Next.js (App Router) + TS + Tailwind で初期化されている
- [ ] `functions/` が Firebase Functions (Node.js 20) + TS で初期化されている
- [ ] `packages/shared/` が TS パッケージとして初期化、`@village/shared` で import 可能
- [ ] `pnpm install` がエラーなく通る
- [ ] `pnpm -r build` が全パッケージで通る (空でも OK)
- [ ] `tsconfig.json` の path alias で `@village/shared` を解決

## 実装メモ
- `firebase init` は P0-01 完了後 (`firebase use dev`)
- `apps/web` は `create-next-app@latest --ts --tailwind --app --src-dir` 推奨
- `functions/` は `firebase init functions` → TypeScript 選択
