---
id: B2-06
title: 証拠一覧画面
assignee: B
estimate_hours: 2.5
phase: 2
depends_on: [B1-07, P0-03]
labels: [nextjs, ui]
---

## 概要

要件 §11.3 の証拠一覧。EvidenceCard グリッド + フィルタ (確度・関連人物)。

## 受け入れ条件

- [ ] `/play/[gameId]/evidence` ルート
- [ ] EvidenceCard グリッド (Firestore listener で自動更新)
- [ ] フィルタ: 関連人物 (キャラ複数選択)、確度 (A/B/C)、入手日
- [ ] 各 card に「尋問で提示」(尋問画面遷移時に preselect) と「ピン留め」
- [ ] 詳細モーダル: name, description, reliability, related_characters
- [ ] true_interpretation 等の内部情報は絶対に表示しない

## 実装メモ

- フィルタ状態は URL query で持つと shareable
- ソートデフォルト: 入手日降順
