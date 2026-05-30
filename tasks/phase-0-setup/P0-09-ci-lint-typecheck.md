---
id: P0-09
title: CI (lint + typecheck + build)
assignee: both
estimate_hours: 1.5
phase: 0
depends_on: [P0-02, P0-07, P0-08]
labels: [ci, infra]
---

## 概要
PR 時に lint / typecheck / build を走らせる GitHub Actions ワークフロー。

## 受け入れ条件
- [ ] `.github/workflows/ci.yml` 作成
- [ ] pnpm + Node 20 セットアップ、pnpm cache 有効
- [ ] ジョブ: `lint` (`pnpm lint`), `typecheck` (`pnpm -r typecheck`), `build` (`pnpm -r build`)
- [ ] 3 ジョブが並列で走る
- [ ] `apps/web` の Next.js build と `functions` の TS compile が通る
- [ ] PR でこの workflow が必須 status check に設定されている (P0-08 の保護ルール側で)

## 実装メモ
- emulator や Firebase deploy は別ワークフローで後ほど
- `actions/setup-node@v4` + `pnpm/action-setup@v4`
