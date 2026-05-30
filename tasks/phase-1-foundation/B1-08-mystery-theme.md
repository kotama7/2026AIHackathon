---
id: B1-08
title: ミステリーUIテーマ / カラートークン
assignee: B
estimate_hours: 1.5
phase: 1
depends_on: [B1-01]
labels: [ui]
---

## 概要

ゲームの世界観 (古びた監査記録・裁判所) に合うカラーパレットとタイポグラフィを確定。CSS 変数として全画面で再利用。

## 受け入れ条件

- [ ] `globals.css` の `:root` に色トークン: `--bg-base`, `--bg-elevated`, `--text-primary`, `--text-muted`, `--accent-gold`, `--accent-danger`, `--accent-success`, `--border-subtle`
- [ ] Tailwind config で `colors.brand.*` として参照可能
- [ ] フォントウェイト / 行間トークン
- [ ] スクロールバー / 選択 (`::selection`) のカスタム色
- [ ] `/dev/tokens` ルートでトークン一覧を表示するページ (社内確認用)

## 実装メモ

- カラーは accessibility (WCAG AA contrast) を満たすか確認
- 後で画像/動画を入れる前提で、`<video>` placeholder スタイルも考慮
