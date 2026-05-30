---
id: B1-07
title: デザインシステム雛形 (基本コンポーネント)
assignee: B
estimate_hours: 3
phase: 1
depends_on: [B1-01]
labels: [nextjs, ui]
---

## 概要

プロジェクト全体で使う基本コンポーネントを `apps/web/src/components/ui/` に実装。Tailwind + class-variance-authority (cva) パターン。

## 受け入れ条件

- [ ] `<Button variant="primary|secondary|danger|ghost" size="sm|md|lg">`
- [ ] `<Card>`, `<CardHeader>`, `<CardBody>`, `<CardFooter>`
- [ ] `<Modal>` (Radix Dialog ベース)、トラップ・ESC 閉じ対応
- [ ] `<CharacterAvatar name iconColor isAlive>` (SVG 円 + イニシャル or 絵文字)
- [ ] `<EvidenceCard evidence onPin onPresent>` (証拠表示)
- [ ] `<LogBubble speaker text intent confidence onPin>` (発言バブル)
- [ ] `<Badge>` (確度・状態表示)
- [ ] Storybook は不要、`/dev/components` ルートで開発確認可

## 実装メモ

- アクセシビリティ: focus visible リング、ARIA label
- Radix UI を Modal / Dropdown 系で活用
