---
id: A2-05
title: Generator 証言生成
assignee: A
estimate_hours: 2
phase: 2
depends_on: [A2-04]
labels: [llm, functions]
---

## 概要

要件 §6.5 の証言を生成。各証言は truth / lie / misunderstanding / omission / uncertainty のいずれか。

## 受け入れ条件

- [ ] `generateTestimonies(skeleton, characters, timeline, evidence)` が `Testimony[]` を返す
- [ ] 各キャラクターから最低 2 件、合計 12 件以上
- [ ] 嘘証言には `lie_reason` と `contradicted_by[]` (証拠 ID) が必ず設定
- [ ] 全証言が `known_facts_used` でキャラの知識範囲に収まることを確認
- [ ] 最低 1 件は明確な矛盾を含む (嘘が崩せる仕組み)

## 実装メモ

- 「悪い嘘 (理由なし)」が生成されたら再生成
- 沈黙 (omission) は「重要だが言及しない」もので、別タイプの証拠/質問で炙り出せる
