---
id: B1-05
title: Functions callable ラッパー + モックモード切替
assignee: B
estimate_hours: 2
phase: 1
depends_on: [P0-04, B1-02]
labels: [nextjs, functions]
---

## 概要

`apps/web/src/lib/firebase/functions.ts` で型付き callable ラッパーを実装。`NEXT_PUBLIC_USE_MOCK=true` の時はモック実装を返し、Person A のバックエンドが未完成でも UI 開発を進められる。

## 受け入れ条件

- [ ] `callStartNewGame`, `callSubmitInterrogation`, `callAdvanceToTrial`, `callSubmitTrialDecision`, `callSubmitNightAction`, `callRevealTruth` の型付き wrapper
- [ ] 入出力型は `@village/shared` から
- [ ] エラーは `FirebaseError.code` を `FunctionErrorCode` にマップして throw
- [ ] モックモード: `apps/web/src/lib/firebase/functionsMock.ts` に fixture を置き、上記関数を fixture 返却に切替
- [ ] dev console に `[MOCK]` プレフィックスでログ

## 実装メモ

- `httpsCallable<Req, Res>(functions, 'startNewGame')` で typed callable
- モックは 500ms の delay を入れて Functions のレイテンシを擬似的に再現
