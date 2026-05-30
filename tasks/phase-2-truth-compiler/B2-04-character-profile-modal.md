---
id: B2-04
title: キャラクタープロフィールモーダル
assignee: B
estimate_hours: 2
phase: 2
depends_on: [B2-03]
labels: [ui]
---

## 概要
キャラクターの公開情報を表示するモーダル。発言履歴、信頼度、関連証拠を集約。

## 受け入れ条件
- [ ] アバター + 名前 + public_personality
- [ ] 信頼度バー (0-100)
- [ ] このキャラの発言一覧 (議論ログ + 尋問回答、最新順)
- [ ] このキャラに関連する証拠カードのサムネ
- [ ] 「尋問する」ボタン → 尋問画面に遷移 (B3-02 完成後)
- [ ] secret / private_goal などの内部情報は絶対に表示しない

## 実装メモ
- 発言抽出: `publicLogs.where('speaker_id', '==', charId)`
- ピン留めボタンも各発言に併設
