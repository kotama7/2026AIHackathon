---
id: A2-04
title: Generator 証拠生成 (3 階層)
assignee: A
estimate_hours: 3
phase: 2
depends_on: [A2-03]
labels: [llm, functions]
---

## 概要
要件 §6.4 の 3 階層 (確定 / 補助 / ノイズ) 証拠を生成。各証拠は timeline event を source として持つ。

## 受け入れ条件
- [ ] `generateEvidence(skeleton, timeline, characters)` が `Evidence[]` を返す
- [ ] 確定証拠 ≥ 2 (真犯人を強く指す)
- [ ] 補助証拠 ≥ 2 (確定を補強)
- [ ] ノイズ証拠 ≥ 2 (レッドヘリングへ誘導、別解釈可能)
- [ ] 各証拠に `points_to[]`, `weight`, `ambiguity`, `true_interpretation`, `source_timeline_event`
- [ ] 3 日分に分散 (1 日 3 枚目安)

## 実装メモ
- 証拠タイプ dictionary: 扉ログ, 足跡, メッセージ, 監視カメラ, 物的遺留品, 目撃証言断片
- weight: 確定 3, 補助 2, ノイズ 1
