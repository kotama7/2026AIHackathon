---
id: A1-03
title: プロンプトテンプレ置き場の骨格
assignee: A
estimate_hours: 1
phase: 1
depends_on: [P0-02]
labels: [llm, functions]
---

## 概要

`functions/src/llm/prompts/` に Generator / Validator / Repairer / Speaker のプロンプト雛形ファイルを用意。役割分離が見えるディレクトリ構造を作る。

## 受け入れ条件

- [ ] `prompts/generator/` 配下に `caseSkeleton.ts`, `characters.ts`, `timeline.ts`, `evidence.ts`, `testimonies.ts`, `deductionPath.ts`
- [ ] `prompts/validator/` 配下に `deducibility.ts`, `logic.ts`, `motivation.ts`
- [ ] `prompts/repairer/` 配下に `repair.ts`
- [ ] `prompts/speaker/` 配下に `discussion.ts`, `interrogation.ts`, `defense.ts`, `reaction.ts`
- [ ] 各ファイルは `export function buildXxxPrompt(args): string` の形を統一
- [ ] 中身は空文字 + TODO コメントで OK (実装は Phase 2/3 タスク)

## 実装メモ

- 言語: 日本語プロンプト
- 系統的なプロンプトエンジニアリングのため `## ロール` `## 入力` `## 出力形式` `## 制約` セクションを統一
