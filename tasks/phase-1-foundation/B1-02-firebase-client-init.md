---
id: B1-02
title: Firebase クライアント SDK 初期化
assignee: B
estimate_hours: 1
phase: 1
depends_on: [P0-01, B1-01]
labels: [nextjs, firestore]
---

## 概要

`apps/web/src/lib/firebase/client.ts` で Firebase SDK を初期化 (Auth / Firestore / Functions)。emulator 接続切替もサポート。

## 受け入れ条件

- [ ] `getFirebaseApp()` がシングルトンを返す
- [ ] `getAuth()`, `getFirestore()`, `getFunctions(app, 'asia-northeast1')` ヘルパー
- [ ] `NEXT_PUBLIC_USE_EMULATOR=true` の時は emulator (auth 9099 / firestore 8080 / functions 5001) に接続
- [ ] `.env.local.example` に `NEXT_PUBLIC_FIREBASE_*` キー列挙
- [ ] HMR 時に重複初期化しない (Next.js dev 用)

## 実装メモ

- `getApps().length === 0 ? initializeApp(config) : getApp()`
- Functions emulator 接続は `connectFunctionsEmulator` (一度のみ)
