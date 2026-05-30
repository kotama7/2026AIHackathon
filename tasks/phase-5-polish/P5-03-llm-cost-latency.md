---
id: P5-03
title: LLM コスト / レイテンシ計測
assignee: A
estimate_hours: 2
phase: 5
depends_on: [A3-09, A4-05]
labels: [llm]
---

## 概要

1 ゲーム完走で何回 Gemini を呼ぶか、合計トークン数、平均レイテンシを実測。無料枠で何ゲーム回せるかを把握。

## 受け入れ条件

- [ ] callGemini ラッパーに metrics 記録 (Cloud Logging 構造化ログ)
- [ ] 1 ゲーム平均: 呼び出し回数、input/output トークン、合計レイテンシ
- [ ] レポート `functions/test/results/cost-latency.md`
- [ ] 無料枠 (1日 60RPM, 月 1500 リクエスト程度) で何ゲーム可能か試算

## 実装メモ

- 結果が悪ければ並列化 / キャッシュ / 弱モデル切替を検討
- 公開デモ用にはレート制限を考慮した queue が要る場合も
