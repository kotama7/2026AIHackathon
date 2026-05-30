---
id: B1-03
title: Anonymous Auth 自動ログインフロー
assignee: B
estimate_hours: 1.5
phase: 1
depends_on: [B1-02]
labels: [nextjs, ui]
---

## 概要

初回アクセス時に自動で Anonymous sign-in し、uid をクライアントで保持。React Provider で全画面に提供。

## 受け入れ条件

- [ ] `<AuthProvider>` コンポーネントが `apps/web/src/app/layout.tsx` の最上位に置かれる
- [ ] 未ログイン時に自動 `signInAnonymously`、loading 中はスプラッシュ表示
- [ ] `useAuth()` フックで `{ uid, loading }` が取れる
- [ ] sign-in 失敗時のフォールバック UI (リトライボタン)
- [ ] sign-out → 再 sign-in でも新しい uid が発行されることを確認

## 実装メモ

- `onAuthStateChanged` を購読してから loading=false
- localStorage に uid を別途保存する必要なし (Firebase SDK が persist する)
