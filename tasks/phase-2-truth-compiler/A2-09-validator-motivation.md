---
id: A2-09
title: Validator 思惑整合性検証
assignee: A
estimate_hours: 2
phase: 2
depends_on: [A2-02, A2-05]
labels: [llm, functions]
---

## 概要
要件 §7.3 の思惑整合 (キャラ動機の妥当性) を検証。一部 LLM 評価あり。

## 受け入れ条件
- [ ] 検証項目:
  - [ ] 全キャラに private_goal あり
  - [ ] 嘘証言には lie_reason あり (純ロジック)
  - [ ] 村人が人狼の正体を知っている記述 NG (純ロジック)
  - [ ] 各キャラの行動が personality / private_goal / fear と矛盾しない (LLM judge)
- [ ] LLM judge は yes/no + 短い理由を返す軽量プロンプト
- [ ] 失敗時は該当キャラ ID と理由をリスト返却

## 実装メモ
- LLM judge は temperature 0.2 で安定化
- ロジック検証だけで通せる項目は LLM 呼ばない
