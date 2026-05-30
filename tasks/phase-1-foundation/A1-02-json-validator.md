---
id: A1-02
title: JSON スキーマ検証ハーネス (zod + 自動再生成)
assignee: A
estimate_hours: 3
phase: 1
depends_on: [P0-05, A1-01]
labels: [llm, functions]
---

## 概要
LLM 出力 JSON を zod で検証し、失敗時に「失敗理由」をプロンプトに添えて自動再生成するハーネスを `functions/src/llm/validateAndRetry.ts` に実装。

## 受け入れ条件
- [ ] `generateStructured({ prompt, schema, maxAttempts })` の単一エントリ
- [ ] 1 回目失敗時は「先ほどの出力は次の理由で失敗した: ...。修正して JSON のみ出力せよ」を付け足して再試行
- [ ] 最大 3 回まで再試行、それでも失敗なら `LLMSchemaError` を throw
- [ ] JSON 抽出は ```json ... ``` フェンス / 素の JSON 両対応
- [ ] 単体テスト: 成功ケース、1 回目失敗→2 回目成功、3 回連続失敗

## 実装メモ
- zod 4.x or 3.x。`safeParse` でエラー詳細を取得して LLM に渡す
- Gemini の `responseMimeType: 'application/json'` を活用 (JSON 生成精度向上)
- 「失敗理由」は zod error の path + message を最大 5 件まで
