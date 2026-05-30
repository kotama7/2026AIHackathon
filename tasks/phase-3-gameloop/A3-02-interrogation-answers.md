---
id: A3-02
title: 個別尋問回答生成 (5 質問タイプ別プロンプト)
assignee: A
estimate_hours: 4
phase: 3
depends_on: [A1-01, A1-02, A2-12]
labels: [llm, functions]
---

## 概要

要件 §10.5, §10.6 の 5 質問タイプ (normal / deep_dive / evidence / contradiction / force_testimony) ごとに最適化されたプロンプトで回答生成。

## 受け入れ条件

- [ ] `generateInterrogationAnswer({ gameId, targetId, questionType, evidenceId?, previousAnswers })` が回答テキスト + 内部メタを返す
- [ ] 各 questionType で異なるプロンプト戦略 (深掘りは詳細記述、矛盾追及は過去発言との対比、強制証言は譲歩を引き出す圧)
- [ ] 嘘判定: target が嘘をついた発言は `caseTruth.planned_lies` と照合して `truth_status: 'lie'`
- [ ] 過去の自分の発言と矛盾しないよう、対象キャラの発言要約を context に渡す
- [ ] 出力 schema 検証 + 知識範囲チェック (A3-03 と統合)

## 実装メモ

- evidence 提示時は証拠の description を context に入れ、対象がどう反応すべきか lie_policy 参照
- contradiction 提示時は引用元 log/testimony を context に
