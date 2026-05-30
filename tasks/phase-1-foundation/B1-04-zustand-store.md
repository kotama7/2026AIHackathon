---
id: B1-04
title: Zustand ゲームストア
assignee: B
estimate_hours: 2
phase: 1
depends_on: [P0-03, B1-01]
labels: [nextjs, ui]
---

## 概要
クライアントゲーム状態を Zustand で管理 (`apps/web/src/stores/gameStore.ts`)。Firestore listener と同期する pattern も用意。

## 受け入れ条件
- [ ] `useGameStore` で `gameId`, `meta`, `characters`, `evidence`, `logs`, `pins` を取得可
- [ ] `setMeta`, `setCharacters`, `addPin`, `removePin`, `addEvidence` 等の action
- [ ] Selector helpers: `useAliveCharacters()`, `useRemainingPoints()`
- [ ] `reset()` でゲーム終了時に全 state をクリア
- [ ] devtools middleware (`@redux-devtools/extension`) を dev 時のみ enable

## 実装メモ
- listener は別 hook (`useSyncFirestoreToStore(gameId)`) で実装、ストア本体は purely client
- 型は全部 `@village/shared` から
