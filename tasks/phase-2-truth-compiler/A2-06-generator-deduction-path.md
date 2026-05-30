---
id: A2-06
title: Generator deduction_path 生成
assignee: A
estimate_hours: 3
phase: 2
depends_on: [A2-04, A2-05]
labels: [llm, functions]
---

## 概要

要件 §6.6, §12.8 の推理経路を生成。プレイヤーがどの証拠 + 証言の順で人狼に到達するかを明示。

## 受け入れ条件

- [ ] `generateDeductionPath(caseTruth)` が `DeductionStep[]` を返す
- [ ] 各 step に reasoning, required_evidence[], required_testimonies[], excluded_suspects[]
- [ ] 最終 step で人狼 1 人に到達
- [ ] required_evidence は実在する evidence_id
- [ ] excluded_suspects は順次絞り込まれていく (重複排除しても整合)

## 実装メモ

- LLM に生成させた後、Validator 側で「step が論理的に繋がっているか」を別途検証
- step 数の目安: 3〜5
