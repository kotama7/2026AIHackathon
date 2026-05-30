---
id: A2-13
title: Truth Compiler 連続生成成功率テスト
assignee: A
estimate_hours: 1.5
phase: 2
depends_on: [A2-12]
labels: [llm, ci]
---

## 概要

本物の Gemini を叩いて 10 回連続生成し、成功率と各段階の所要時間/トークン数を計測。閾値未達ならプロンプト調整 (P5-02 に繋ぐ)。

## 受け入れ条件

- [ ] `pnpm --filter functions test:e2e:truth-compiler` で 10 回連続生成
- [ ] 成功率 70% 以上 (目標 80%)
- [ ] 平均所要時間 60 秒以内
- [ ] 1 ゲームあたりのトークン消費を CSV 出力
- [ ] 結果サマリーを `functions/test/results/` に保存

## 実装メモ

- このテストは CI では走らせない (API キー必須 + 課金)
- 手動実行で測定。P5 で再度計測して改善幅を見る
