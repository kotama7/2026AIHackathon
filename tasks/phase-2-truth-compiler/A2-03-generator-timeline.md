---
id: A2-03
title: Generator 夜間タイムライン生成
assignee: A
estimate_hours: 3
phase: 2
depends_on: [A2-02]
labels: [llm, functions]
---

## 概要
事件夜の各キャラクターの行動を時系列で生成する。要件 §12.3 の `TimelineEvent` を全員分。

## 受け入れ条件
- [ ] `generateTimeline(skeleton, characters)` が `TimelineEvent[]` を返す
- [ ] 全キャラクターについて 23:00〜01:00 の行動が記録される (最低 3 イベント/人)
- [ ] 人狼の移動経路が物理的に矛盾しない (同時刻に複数地点 NG)
- [ ] 被害者は襲撃時刻に襲撃場所にいる
- [ ] `known_by` / `observed_by` がキャラクター ID として正当
- [ ] `causes_evidence` フィールドは後段 (A2-04) で埋まる前提で空配列 OK

## 実装メモ
- 場所セットは 6〜8 個に絞る (例: 自室、ロビー、時計塔、図書室、中庭、地下室)
- 移動には所要時間を考慮 (隣接性は LLM に与える)
