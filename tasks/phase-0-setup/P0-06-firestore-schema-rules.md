---
id: P0-06
title: Firestore コレクション設計 + セキュリティルール初稿
assignee: both
estimate_hours: 1.5
phase: 0
depends_on: [P0-01, P0-03]
labels: [firestore, infra]
---

## 概要
Firestore コレクション構造を確定し、`firestore.rules` 初稿を書く。`users/{uid}/games/...` は所有者のみ read、`internal/{gameId}/...` は完全クライアント非公開とする。

## 受け入れ条件
- [ ] `要件定義書/実装計画.md §3.3` のコレクション構造に従って `firestore.rules` が書かれている
- [ ] `users/{uid}/games/{gameId}/**`: `request.auth.uid == uid` のみ read。write は全て拒否 (Functions 経由)
- [ ] `internal/**`: 完全に拒否 (Admin SDK のみ)
- [ ] `firestore.indexes.json` 初稿 (空 or 必要分のみ)
- [ ] `firebase.json` の `firestore` セクションが ↑ を指す
- [ ] emulator (`firebase emulators:start --only firestore`) で rules が読まれることを確認

## 実装メモ
- A1-07 で rules-test を書く (このタスクはルール定義まで)
- write を全部 deny する判断: クライアント直書きを禁止することで、サーバー側で型・ロジック検証を保証できる
