---
id: A3-09
title: submitNightAction callable 完成
assignee: A
estimate_hours: 1.5
phase: 3
depends_on: [A3-06, A3-07]
labels: [functions]
---

## 概要
夜フェーズ確定 callable。A3-06 / A3-07 をまとめ、翌朝への状態遷移を完了させる。

## 受け入れ条件
- [ ] 入力検証 (現在フェーズが night か)
- [ ] A3-06 を呼んで夜間処理
- [ ] 日付を +1、ポイント回復、フェーズを morning に
- [ ] A3-07 で勝敗判定、結果が出たら status 更新
- [ ] Day 3 night 終了 → 強制的に勝敗評価
- [ ] レスポンスに新日付・新証拠・監視結果・gameOver フラグ

## 実装メモ
- Day 3 終了時の処理に注意 (もう次の朝はない、結果画面へ)
- 全 Firestore 書き込みは batch / transaction
