---
id: B3-04
title: ピン留め機能 (発言・証拠)
assignee: B
estimate_hours: 2.5
phase: 3
depends_on: [B3-01, B2-06, B1-04]
labels: [nextjs, ui, firestore]
---

## 概要
要件 §10.7 のピン留め。議論ログ発言 / 尋問回答 / 証拠カードを保存できる。

## 受け入れ条件
- [ ] 発言バブル / 証拠カードに「ピン留め」アイコン
- [ ] クリックで `users/{uid}/games/{gameId}/pins/` に書き込み (これはクライアントからも書ける例外、または Functions 経由)
- [ ] 既にピン済みはアイコン状態が変化
- [ ] ピン解除も可
- [ ] Zustand store の pins を Firestore と同期 (B2-08 に追加)

## 実装メモ
- pins のスキーマ: `{ id, refType: 'log'|'evidence'|'testimony', refId, day, note?, createdAt }`
- セキュリティ上、pin は所有者のみ。Firestore rules で `users/{uid}/games/{gameId}/pins` のみ owner write 許可 (例外的に)
