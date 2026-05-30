---
id: A3-04
title: 信頼度変化計算
assignee: A
estimate_hours: 1.5
phase: 3
depends_on: [P0-03]
labels: [functions]
---

## 概要

要件 §10.10 の信頼度システム。プレイヤーのアクションに応じてキャラごとの trust_to_player と村全体の villageTrust を更新。

## 受け入れ条件

- [ ] `calculateTrustDelta(action, context)` が `{ characterDeltas: Record<charId, number>, villageDelta: number }`
- [ ] ルール:
  - 正しい矛盾指摘: 対象 +5、村 +3
  - 誤った疑い (証拠不十分): 対象 -10、村 -5
  - 強制証言: 対象 -8 (圧迫)、村 -3
  - 人狼処刑成功: 全村 +20
  - 村人誤処刑: 全村 -30
- [ ] Firestore transaction で atomic 更新
- [ ] 0-100 にクランプ

## 実装メモ

- 「正しい矛盾指摘」の判定は `presentedEvidence` が `testimony.contradicted_by` を含むか
- 純関数で書き、テスタブルに
