---
id: B3-05
title: 矛盾整理画面 (ピン複数選択 → 保存)
assignee: B
estimate_hours: 2.5
phase: 3
depends_on: [B3-04]
labels: [nextjs, ui]
---

## 概要

要件 §10.7 後半 / §11 のピン整理 + 矛盾候補作成画面。

## 受け入れ条件

- [ ] `/play/[gameId]/pins` ルート
- [ ] ピン一覧 (日付・タイプでフィルタ)
- [ ] 複数選択して「矛盾候補として保存」→ `contradictions/` コレクション
- [ ] 候補に短いメモを追加可
- [ ] 候補一覧、編集、削除
- [ ] 裁判画面 (B4-01) から候補を提示できる導線

## 実装メモ

- 矛盾候補スキーマ: `{ id, pinIds[], note, createdAt }`
- ドラッグ&ドロップは MVP 不要、チェックボックスで OK
