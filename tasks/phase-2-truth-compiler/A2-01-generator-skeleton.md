---
id: A2-01
title: Generator 事件骨格生成
assignee: A
estimate_hours: 3
phase: 2
depends_on: [A1-01, A1-02, A1-03]
labels: [llm, functions]
---

## 概要

要件 §6.1 の事件骨格 (人狼, 被害者, 襲撃時刻, 襲撃場所, 襲撃経路, 主要証拠タイプ, レッドヘリング, 解決ロジック) を生成する初手プロンプトを実装。

## 受け入れ条件

- [ ] `generateCaseSkeleton(seedConfig)` が `CaseSkeleton` を返す
- [ ] 入力: キャラクター数 (6 固定), 難易度 (easy/normal/hard)
- [ ] 出力スキーマ: zod で `caseSkeletonSchema` を満たす
- [ ] レッドヘリング村人と理由が必ず含まれる
- [ ] 10 回連続生成して 8 回以上 schema validation を通る
- [ ] ユニットテスト (LLM mock) で骨格構造を確認

## 実装メモ

- temperature 0.9 で多様性を確保
- プロンプトに「過去 N 件の生成例と被らない」指示を入れて多様化
