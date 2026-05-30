---
id: P5-01
title: バランス調整 (スコア閾値 / ポイント / 信頼度)
assignee: both
estimate_hours: 3
phase: 5
depends_on: [A4-05, A4-06, A3-09, B4-01]
labels: [llm]
---

## 概要
通しプレイを 5〜10 回行い、難易度バランス (尋問ポイント数、信頼度変化量、スコアランク閾値) を調整。

## 受け入れ条件
- [ ] 通しプレイ 5 回以上 (両者でクロスプレイ)
- [ ] 「人狼が当てられない」が多い → 証拠スコアの weight 調整
- [ ] 「ポイントが余りすぎ/足りなさすぎ」→ cost 調整
- [ ] ランク S が出にくすぎる/簡単すぎる → 閾値調整
- [ ] 調整内容を `tasks/phase-5-polish/balance-notes.md` に記録

## 実装メモ
- バランス定数は `@village/shared/src/constants/balance.ts` に集約しておくと調整が早い
