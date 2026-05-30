---
id: A1-05
title: startNewGame のスタブ実装 (ダミーデータ返却)
assignee: A
estimate_hours: 2
phase: 1
depends_on: [A1-01, A1-04, P0-04]
labels: [functions]
---

## 概要
LLM を呼ばずに固定ダミーデータを返す `startNewGame` callable のスタブ実装。Person B が UI を本物のレスポンス形状で開発できるようにする。

## 受け入れ条件
- [ ] `functions/src/index.ts` に `exports.startNewGame = onCall(...)` で登録
- [ ] 認証チェック: `request.auth?.uid` が無ければ `unauthenticated` エラー
- [ ] 固定の 6 人キャラ + 3 枚証拠 + 議論ログ 5 件を Firestore に書き込み、`gameId` を返す
- [ ] 同一 uid から複数 game を作れる (新 gameId を発行)
- [ ] レスポンス型は `StartNewGameResponse` (P0-04) に準拠
- [ ] emulator で動作確認、Person B がモック切替で実呼び出しに繋ぎ替え可

## 実装メモ
- `gameId` は `uuid v4` or Firestore auto-id
- ダミーデータは `functions/src/seed/dummyGame.ts` に分離 (A2-12 で差し替え時に削除しやすく)
