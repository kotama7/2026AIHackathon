---
id: A4-03
title: 判決処理 (処刑 → 正解判定 → 勝敗 or 保留)
assignee: A
estimate_hours: 2
phase: 4
depends_on: [A3-07]
labels: [functions]
---

## 概要

プレイヤーの判決を受けてゲーム状態を更新。処刑なら対象を死亡にし勝敗判定、保留なら信頼度のみ調整。

## 受け入れ条件

- [ ] `processVerdict({ gameId, day, suspectId, decision })`
- [ ] 処刑: 対象キャラを `aliveCharacters` から除外、`TrialDecision.was_correct` を計算 (人狼か否か)
- [ ] 信頼度更新 (A3-04: 人狼処刑 +20、村人誤処刑 -30)
- [ ] A3-07 で勝敗判定、終了なら status 更新
- [ ] 保留: trustDelta のみ、status は in_progress 維持
- [ ] Firestore `trials/{day}` に判決ログ保存

## 実装メモ

- 処刑後の人狼が居なくなれば即「勝利」
- transaction で atomic
