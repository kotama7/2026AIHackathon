---
id: A1-01
title: Gemini クライアントラッパー
assignee: A
estimate_hours: 2
phase: 1
depends_on: [P0-01, P0-02]
labels: [llm, functions]
---

## 概要

Cloud Functions から Gemini を呼ぶ共通ラッパー `functions/src/llm/geminiClient.ts` を実装。リトライ・タイムアウト・温度設定を統一する。

## 受け入れ条件

- [ ] 単一エントリポイント: `callGemini({ prompt, schema?, temperature?, maxOutputTokens?, retries? })`
- [ ] 429 / 5xx は最大 3 回まで指数バックオフ (1s, 2s, 4s)
- [ ] タイムアウト 30 秒、超過時は `GeminiTimeoutError` を throw
- [ ] API キーは Secret Manager の `GEMINI_API_KEY` を `defineSecret` で読む
- [ ] emulator から疎通する単体テスト 1 本 (実 API は叩かず、SDK を mock)

## 実装メモ

- SDK: `@google/generative-ai`
- `gemini-1.5-flash` を MVP の default に (無料枠を考慮)
- ストリーミングは不要、`generateContent` で OK
- temperature は Generator=0.9, Validator=0.2, Speaker=0.7 を defaults として export
