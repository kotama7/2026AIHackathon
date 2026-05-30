---
id: A2-07
title: Validator 特定可能性検証 (スコア集計)
assignee: A
estimate_hours: 3
phase: 2
depends_on: [A2-06]
labels: [llm, functions]
---

## 概要

要件 §6.7, §7.1 の特定可能性を計算的に検証 (LLM 不使用、純ロジック)。

## 受け入れ条件

- [ ] `validateDeducibility(caseTruth)` が `ValidationResult` を返す
- [ ] 各キャラクターのスコア = Σ(points_to に含まれる evidence の weight)
- [ ] 検証項目:
  - [ ] 真犯人スコアが最大
  - [ ] 真犯人スコア 7〜10
  - [ ] 最大レッドヘリングスコア 4〜6
  - [ ] 差分 2〜4
  - [ ] 真犯人を示す証拠 ≥ 2
  - [ ] deduction_path が最後まで接続している (excluded_suspects の和集合 + 残り 1 人 = 全員)
- [ ] 失敗時は失敗理由の構造化リスト

## 実装メモ

- 純関数で書く、LLM 呼ばない
- 単体テスト: 良いケース 1 件、各失敗条件 1 件ずつ
