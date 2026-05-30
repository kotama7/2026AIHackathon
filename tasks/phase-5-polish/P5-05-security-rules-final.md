---
id: P5-05
title: Firestore セキュリティルール最終確認
assignee: A
estimate_hours: 1.5
phase: 5
depends_on: [A1-07]
labels: [firestore, ci]
---

## 概要
全機能実装後、想定外の write パスや漏洩がないか rules を再点検。emulator テスト網羅。

## 受け入れ条件
- [ ] `internal/**` への read/write を匿名 + 任意 uid で全部試行 → 全拒否確認
- [ ] `users/{uid}/games/{gameId}/pins` のクライアント書き込みは owner のみ
- [ ] 他人の uid 配下への read/write は全拒否
- [ ] 全 ruleset test を CI で必須化
- [ ] App Check の導入を検討 (V2 候補、なくても可)

## 実装メモ
- secret/caseTruth のように特に秘匿の高いコレクションは複数層 (Functions check + rules check)
