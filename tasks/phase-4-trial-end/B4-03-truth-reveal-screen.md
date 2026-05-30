---
id: B4-03
title: 真相開示画面 (deduction_path ステップ表示)
assignee: B
estimate_hours: 3
phase: 4
depends_on: [B1-07, P0-03]
labels: [nextjs, ui]
---

## 概要
要件 §11.6 の真相開示。実際の人狼、夜間行動、嘘の理由、推理経路をプレイヤーの行動と比較表示。

## 受け入れ条件
- [ ] 「実際の人狼」セクション (キャラカード + 動機)
- [ ] 「夜間タイムライン」セクション (時系列ビュー)
- [ ] 「各キャラの秘密」アコーディオン
- [ ] 「嘘の理由」リスト (testimony + lie_reason + contradicted_by)
- [ ] 「証拠の真の意味」(true_interpretation 開示)
- [ ] 「推理経路 (deduction_path)」を step ごとに展開、プレイヤーが該当証拠/証言を持っていたかチェックマーク
- [ ] 「あなたの推理との比較」セクション (presented vs ideal)

## 実装メモ
- 情報量が多いのでセクション分け + アコーディオン
- ネタバレ防止のため、ゲーム終了時のみアクセス可
