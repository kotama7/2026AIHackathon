---
id: P5-02
title: プロンプト調整 (Truth Compiler 成功率向上)
assignee: A
estimate_hours: 4
phase: 5
depends_on: [A2-13]
labels: [llm]
---

## 概要

A2-13 の成功率が 80% 未満であれば、Generator / Validator / Repairer のプロンプトを iterate。

## 受け入れ条件

- [ ] 失敗パターンを分類 (schema 不一致 / 論理破綻 / スコア不足 / その他)
- [ ] 各パターンに対する prompt の改善案を実装
- [ ] 改善後に再度 10 連続生成、成功率 80%+ を目指す
- [ ] before/after の比較を `functions/test/results/prompt-iteration.md` に記録

## 実装メモ

- プロンプトの few-shot example を追加するのが最も効きやすい
- 失敗例の summary を新プロンプトに「これは避けよ」として注入
