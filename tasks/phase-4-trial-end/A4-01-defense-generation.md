---
id: A4-01
title: 容疑者弁明生成 (人狼 / 村人別プロンプト)
assignee: A
estimate_hours: 3
phase: 4
depends_on: [A1-01, A2-12]
labels: [llm, functions]
---

## 概要
要件 §10.8 の裁判で、容疑者として指定されたキャラクターの弁明を生成。人狼と村人で戦略を分ける。

## 受け入れ条件
- [ ] `generateDefense({ gameId, suspectId, presentedEvidence, presentedContradictions })` が弁明テキストを返す
- [ ] 人狼: 提示証拠を別解釈に持っていく / レッドヘリングへ誘導 / 過去発言と整合
- [ ] 村人: 自分の secret を可能な限り守りつつ反証 / 真実を言うか嘘で凌ぐかは lie_policy 参照
- [ ] 提示矛盾に対する個別反論
- [ ] 出力 schema 検証
- [ ] 演出: 弁明は 2〜4 段落で、感情を伴う (emotion field)

## 実装メモ
- temperature 0.7 (人狼) / 0.5 (村人)
- 弁明後に他キャラの反応 (A4-02) を生成
