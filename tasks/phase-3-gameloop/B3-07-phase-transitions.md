---
id: B3-07
title: フェーズ間トランジション演出
assignee: B
estimate_hours: 2
phase: 3
depends_on: [B2-07]
labels: [ui]
---

## 概要

朝 → 議論 → 調査 → 裁判 → 夜 のフェーズ切替時に、世界観に沿った短いトランジション (1〜2s) を挿入。

## 受け入れ条件

- [ ] フェーズ切替検知 (Zustand meta.currentPhase の変化を購読)
- [ ] 朝: 朝日のフェード、Day X 表示
- [ ] 議論: 群衆の talking 効果
- [ ] 裁判: ガベルの音 + 「裁判開始」字幕
- [ ] 夜: 画面暗転 + 月の icon
- [ ] スキップ可 (ESC or クリック)

## 実装メモ

- Framer Motion で実装
- 音は MVP では絵文字 + 視覚演出のみで OK (素材権利の問題回避)
