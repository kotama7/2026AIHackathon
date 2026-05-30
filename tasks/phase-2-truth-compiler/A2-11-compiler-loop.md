---
id: A2-11
title: Truth Compiler 統合ループ (生成→検証→修正)
assignee: A
estimate_hours: 2
phase: 2
depends_on: [A2-10]
labels: [llm, functions]
---

## 概要
Generator → Validator → Repairer のループ制御。最大 3 回 repair、それでも失敗なら全体再生成 (最大 2 回)。

## 受け入れ条件
- [ ] `compileCaseTruth(seedConfig)` が最終的に検証合格した `CaseTruth` を返す
- [ ] 修正回数 / 再生成回数 / 各段階の所要時間を計測ログに記録
- [ ] 6 回 (3 repair × 2 regen) 全部失敗時は `TruthCompilerError` を throw
- [ ] テスト: 100 回実行して 80 回以上成功 (LLM mock + ランダム失敗注入)

## 実装メモ
- 計測ログは Cloud Logging に出して P5-02/P5-03 で活用
- Validator は段階的に: deducibility → logic → motivation の順 (重い順を後に)
