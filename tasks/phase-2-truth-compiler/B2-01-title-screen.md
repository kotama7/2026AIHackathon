---
id: B2-01
title: タイトル画面
assignee: B
estimate_hours: 2
phase: 2
depends_on: [B1-06, B1-07]
labels: [nextjs, ui]
---

## 概要

ゲームの入口。「新規ゲーム」「履歴」を表示。ミステリーUI の世界観確立。

## 受け入れ条件

- [ ] `/` ルートに大きなタイトル「AI村裁判」とサブコピー
- [ ] 「新規ゲーム」ボタン → callStartNewGame を呼んで `/play/[gameId]` に遷移
- [ ] 直近 3 件の履歴 (Firestore から) を表示。「続きから」or「結果を見る」リンク
- [ ] アニメーション: タイトルのフェードイン、ボタンの ホバー演出
- [ ] レスポンシブ (PC / タブレット)

## 実装メモ

- 履歴取得は `users/{uid}/games/` を `orderBy('createdAt', 'desc').limit(3)` で
- 新規ゲーム作成中は B2-02 のローディング画面に遷移
