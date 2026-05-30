---
id: A2-10
title: Repairer (Validator 指摘の修正)
assignee: A
estimate_hours: 3
phase: 2
depends_on: [A2-07, A2-08, A2-09]
labels: [llm, functions]
---

## 概要

Validator が返した失敗理由を受け、CaseTruth の最小修正を試みる。要件 §5.3 / §7.4。

## 受け入れ条件

- [ ] `repair(caseTruth, validationErrors)` が修正後の `CaseTruth` を返す
- [ ] 修正対象は失敗理由ごとに絞る (証拠 weight 調整 / 嘘の理由補完 / timeline 衝突解消 / etc)
- [ ] 全体再生成ではなく diff のような部分書換を指示するプロンプト
- [ ] 修正後の出力に対して再度 schema validation
- [ ] 修正できない種類の失敗は明示的に「修正不能」を返し、上位で再生成

## 実装メモ

- プロンプト: 「以下の問題を解決するため、CaseTruth の指定部分のみを変更せよ。全体を返さず、JSON Patch (RFC 6902) で返せ」
- もしくは差分パッチが難しければ「全体再生成 + ロック対象 (人狼/被害者) は変更不可」と指示
