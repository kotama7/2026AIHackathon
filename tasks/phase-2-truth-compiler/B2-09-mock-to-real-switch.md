---
id: B2-09
title: モック→本物 Functions への切替検証
assignee: B
estimate_hours: 1
phase: 2
depends_on: [A2-12, B1-05]
labels: [nextjs]
---

## 概要
`NEXT_PUBLIC_USE_MOCK=false` に切替えて本物の Cloud Functions に接続。全画面が壊れないことを確認。

## 受け入れ条件
- [ ] emulator (dev) と production functions 両方で動作確認
- [ ] タイトル → 新規ゲーム → 村概要 → 議論ログ → 証拠一覧 までスムーズに遷移
- [ ] 型不整合があれば `@village/shared` の型修正で揃える (P0-04 を更新)
- [ ] エラー時の UX 確認 (Functions タイムアウト時)

## 実装メモ
- このタスクは A2-12 の完成を待つ統合ゲート
- 問題見つかったら本人で fix するか、適切な担当者に Issue を切る
