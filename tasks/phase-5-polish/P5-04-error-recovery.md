---
id: P5-04
title: エラーリカバリ強化 (中断ゲーム復元)
assignee: both
estimate_hours: 2
phase: 5
depends_on: [B3-08]
labels: [nextjs, functions]
---

## 概要
ネットワーク切断・タブ閉じからの復帰、Functions 半端な状態の検出と修復。

## 受け入れ条件
- [ ] タブを閉じて再アクセスしても続きから再開可能 (タイトルから履歴で復帰)
- [ ] Functions 実行中にネットワーク切断 → クライアント側で「状態を再取得」ボタンを表示
- [ ] 中途半端な state (例: 議論ログが途中で止まった) を検出して resume または再生成
- [ ] 失敗 game は Firestore で `status: 'corrupted'` を付与しユーザに通知

## 実装メモ
- Functions は基本べき等に書く (transaction で書き込み済みかチェック)
- 完全復元は難しいので「失敗時はその game を捨てて新規」のフローも用意
