---
id: A2-08
title: Validator 論理整合性検証 (時刻 / 場所 / 知識)
assignee: A
estimate_hours: 3
phase: 2
depends_on: [A2-06]
labels: [llm, functions]
---

## 概要
要件 §7.2 の論理整合を検証 (純ロジック)。物理的不可能性とキャラクター知識範囲のチェック。

## 受け入れ条件
- [ ] 検証項目:
  - [ ] 同一人物が同時刻に複数地点に存在しない
  - [ ] 犯人は事件時刻に現場に到達可能 (隣接マトリクスで判定)
  - [ ] 被害者は事件時刻に現場にいる
  - [ ] 各証拠の source_timeline_event が実在
  - [ ] 目撃者がその場所から対象を見られる (visibility ルール)
  - [ ] 各証言の `known_facts_used` がキャラクターの knowledge 範囲内
- [ ] 場所の隣接マトリクスは骨格生成時に決定 (A2-01 で出力)

## 実装メモ
- knowledge 範囲は「自分の行動 + observed_by に自分を含む event」
- 隣接マトリクスを Validator に渡すため A2-01 の出力に含める
