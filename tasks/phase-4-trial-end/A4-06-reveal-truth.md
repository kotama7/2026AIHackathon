---
id: A4-06
title: revealTruth callable (deduction_path 整形)
assignee: A
estimate_hours: 2
phase: 4
depends_on: [A4-04, A1-04]
labels: [functions]
---

## 概要

ゲーム終了時に internal/caseTruth を整形して返す。プレイヤーの行動と比較できる構造にする。

## 受け入れ条件

- [ ] `revealTruth({ gameId })` が `{ caseTruth, score, rank, comparison }` を返す
- [ ] ゲームが status !== 'in_progress' の時のみ実行可
- [ ] deduction_path の各 step に対し、プレイヤーが該当証拠/証言を取得していたかを `comparison` に
- [ ] LLM で短い「真相サマリー」テキストを生成 (要件 §10 結果画面用)
- [ ] スコア breakdown も同梱

## 実装メモ

- comparison: `{ step, hadEvidence: boolean[], hadTestimony: boolean[] }`
- サマリー生成は temperature 0.3、結末の文章として読みやすく
