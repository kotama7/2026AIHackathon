---
id: B1-01
title: Next.js + Tailwind 全体レイアウト
assignee: B
estimate_hours: 2
phase: 1
depends_on: [P0-02]
labels: [nextjs, ui]
---

## 概要
Next.js App Router のルートレイアウトとグローバルスタイルを整える。日本語フォント、メタデータ、ダークテーマベース。

## 受け入れ条件
- [ ] `apps/web/src/app/layout.tsx` でフォント (`Noto Sans JP` + `Noto Serif JP`) を next/font で適用
- [ ] `globals.css` に Tailwind directives + カスタム CSS 変数 (色トークン)
- [ ] メタデータ: title="AI村裁判", description, OGP placeholder
- [ ] viewport 設定、`html lang="ja"`
- [ ] `tailwind.config.ts` で colors / fontFamily / spacing 拡張

## 実装メモ
- ダーク基調 (ミステリー演出)。背景 `#0E0F13`, accent `#C8A24B` (古びた金), danger `#A33B3B`
- フォント: 見出し Serif, 本文 Sans
