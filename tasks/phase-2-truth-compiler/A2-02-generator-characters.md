---
id: A2-02
title: Generator キャラクター思惑生成
assignee: A
estimate_hours: 3
phase: 2
depends_on: [A2-01]
labels: [llm, functions]
---

## 概要

要件 §6.2 のキャラクター属性 (public_personality, private_goal, fear, secret, bias, relationship, lie_policy, cooperation_policy) を、事件骨格と整合する形で全 6 人分生成。

## 受け入れ条件

- [ ] `generateCharacters(skeleton)` が `Character[]` (6 人) を返す
- [ ] 人狼キャラには `is_werewolf: true` と人狼用の private_goal が設定される
- [ ] レッドヘリング村人には骨格で定義された「怪しく見える理由」を反映した secret/lie_policy
- [ ] zod 検証通過、全員に private_goal / fear / secret あり
- [ ] 名前は重複しない、性別/年齢/職業の偏り無し

## 実装メモ

- 名前は事前用意した日本人名 dictionary からランダム抽選 + LLM が選ぶ hybrid
- 人狼の private_goal は「人狼であることを隠して生き残る」だけでなく具体的な誘導戦略を持たせる
