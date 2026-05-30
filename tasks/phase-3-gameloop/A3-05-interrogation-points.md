---
id: A3-05
title: 尋問ポイント管理 (Firestore atomic 操作)
assignee: A
estimate_hours: 1
phase: 3
depends_on: [A1-04, P0-03]
labels: [functions, firestore]
---

## 概要

要件 §10.5 の尋問ポイント (5/日)。Functions 側で atomic 減算、不足時はエラー、日付変更で回復。

## 受け入れ条件

- [ ] `consumePoints(uid, gameId, cost)` を transaction で実装
- [ ] 残量不足は `insufficient_points` エラー
- [ ] `refillPointsOnDayChange(uid, gameId)` を日付遷移時に呼ぶ
- [ ] 質問タイプ別コスト定数を `@village/shared` から
- [ ] テスト: 並列リクエストで負にならないこと

## 実装メモ

- transaction 内で `meta.remainingPoints` を read → check → decrement
- 日数遷移は A3-09 (夜→翌朝) で呼ばれる
