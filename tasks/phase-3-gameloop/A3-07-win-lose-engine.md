---
id: A3-07
title: 勝敗判定エンジン
assignee: A
estimate_hours: 2
phase: 3
depends_on: [P0-03, A1-04]
labels: [functions]
---

## 概要

要件 §10.11 の勝敗判定。Day 終了時 / 裁判判決時 / 夜終了時に評価。

## 受け入れ条件

- [ ] `evaluateGameStatus(gameId)` が `'won' | 'lost_werewolf_survived' | 'lost_too_few_villagers' | 'lost_trust_collapsed' | 'in_progress'`
- [ ] 勝利: 人狼を処刑した
- [ ] 敗北 (狼生存): Day 3 終了で人狼が生きている
- [ ] 敗北 (村壊滅): 生存村人 ≤ 2
- [ ] 敗北 (信頼崩壊): villageTrust < 20
- [ ] 結果が決まったら `meta.status` を更新し、結果保存

## 実装メモ

- 純関数で計算、Firestore 更新は呼び出し側 (A3-09, A4-03)
- ロギング: どの条件で終了したかを記録
