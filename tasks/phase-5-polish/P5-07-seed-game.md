---
id: P5-07
title: デモ用シードゲーム (Truth Compiler フォールバック)
assignee: A
estimate_hours: 2
phase: 5
depends_on: [A2-12]
labels: [functions]
---

## 概要

デモ時に Truth Compiler が失敗してもプレイ可能になるよう、検証済みの fixed CaseTruth を 2〜3 件用意。

## 受け入れ条件

- [ ] `functions/src/seed/seedCases/` に JSON で 2 件以上の検証済み CaseTruth
- [ ] `startNewGame({ useSeed: true })` でシードゲームを起動可能
- [ ] 起動メニュー (タイトル画面) に「サンプル事件で始める」option (B 側で B2-01 拡張)
- [ ] シードは A2-11 の出力を実際に動かして良いものを保存する

## 実装メモ

- ハッカソンデモ直前にこれを 1 件は必ず作る (保険)
- シードは Truth Compiler のテストデータとしても再利用
