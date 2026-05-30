---
id: A1-04
title: Firestore Admin SDK ラッパー (internal/ アクセスヘルパー)
assignee: A
estimate_hours: 1.5
phase: 1
depends_on: [P0-01, P0-06]
labels: [functions, firestore]
---

## 概要
Cloud Functions から `internal/{gameId}/...` と `users/{uid}/games/...` にアクセスするための型安全ヘルパー。Admin SDK 初期化と CRUD ラッパー。

## 受け入れ条件
- [ ] `functions/src/db/admin.ts` で Admin SDK を一度だけ初期化
- [ ] `internalDb.caseTruth.get(gameId)`, `internalDb.caseTruth.set(gameId, data)` のような型付きアクセサ
- [ ] `userDb.games.meta.get(uid, gameId)` 等の型付きアクセサ
- [ ] Timestamp ヘルパー: `nowTimestamp()`, `toTimestamp(date)`
- [ ] Transaction ラッパー (ポイント減算など atomic 操作用)

## 実装メモ
- 型は `@village/shared` を import
- Firestore の collection path は文字列定数で集約 (`COLLECTIONS.INTERNAL_CASE_TRUTH` 等)
- `runTransaction` ラッパーで型推論を効かせる
