---
id: P0-04
title: Cloud Functions callable 契約
assignee: both
estimate_hours: 1
phase: 0
depends_on: [P0-03]
labels: [types, functions]
---

## 概要
Cloud Functions の callable signature を `packages/shared/src/contracts/functions.ts` に列挙する。Person B はこれを見てモックスタブを作る。

## 受け入れ条件
- [ ] 以下 6 関数の `Request` / `Response` 型が定義されている:
  - `startNewGame`
  - `submitInterrogation`
  - `advanceToTrial`
  - `submitTrialDecision`
  - `submitNightAction`
  - `revealTruth`
- [ ] 各関数名は `FunctionName` 型 (string literal union) に列挙
- [ ] 共通エラー型 `FunctionErrorCode = 'insufficient_points' | 'invalid_phase' | 'game_not_found' | 'llm_failure' | ...` を定義
- [ ] `apps/web` から `import type { StartNewGameRequest } from '@village/shared'` できる

## 実装メモ
- 実装より先にこれを書く (契約ファースト)
- 後で field を増やす時は backward-compatible に (optional 追加のみ、削除は同期 PR)
