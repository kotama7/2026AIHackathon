---
id: B1-06
title: ルーティング骨格 (App Router)
assignee: B
estimate_hours: 1.5
phase: 1
depends_on: [B1-01]
labels: [nextjs]
---

## 概要
App Router で全 11 画面に対応するルート構造を作成。中身は placeholder で OK。

## 受け入れ条件
- [ ] `/` = タイトル
- [ ] `/play/[gameId]` = ゲーム本体 (内部でフェーズ切替、ネスト route)
  - `/play/[gameId]/discussion` (議論ログ)
  - `/play/[gameId]/evidence` (証拠一覧)
  - `/play/[gameId]/interrogate` (尋問)
  - `/play/[gameId]/pins` (ピン留め)
  - `/play/[gameId]/trial` (裁判)
  - `/play/[gameId]/night` (夜)
- [ ] `/play/[gameId]/result` = 結果 + 真相開示
- [ ] 各ルートに `page.tsx` (placeholder) と必要に応じて `layout.tsx`
- [ ] 404 (`not-found.tsx`) と loading (`loading.tsx`)

## 実装メモ
- 真相開示は結果ページ内のセクション or `/play/[gameId]/truth` 別ルートかは B4-03 で決める
- フェーズ遷移は server side ではなく Zustand + プログラマティック router.push() で
