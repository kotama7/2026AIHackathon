# P5-03 LLM コスト / レイテンシ計測

## 計測の仕組み (実装済み)

- `callGemini` (`functions/src/llm/geminiClient.ts`) は呼び出しごとに `durationMs` / `inputTokens` / `outputTokens` / `attempts` を Cloud Logging に構造化ログ出力する (`logger.info('[<traceLabel>] success', {...})`)。
- Truth Compiler は各段階 (skeleton/characters/timeline/evidence/testimonies/deductionPath/repair) の `StageMetrics` を `CompileMetrics.stages` に集約 (`functions/src/truthCompiler/compile.ts`)。
- `usageGuard` (`functions/src/llm/usageGuard.ts`) で `LLM_DAILY_REQUEST_LIMIT` による日次上限ガードが可能。

## 計測手順

### 1 ゲーム生成 (Truth Compiler) のコスト

```bash
# GEMINI_API_KEY を設定し、e2e を実行 (10 連続生成 → CSV 出力)
GEMINI_API_KEY=... pnpm --filter @village/functions test:e2e:truth-compiler
# → functions/test/results/truth-compiler-e2e.csv に
#   run,success,durationMs,inputTokens,outputTokens,repairCount,regenCount,error
```

### 1 ゲーム完走 (生成 + 議論 + 尋問 + 裁判 + 真相開示) の呼び出し回数

- 1 ゲーム生成: Generator 6 段階 + Validator(LLM judge は既定 off) + Repairer(0〜3) ≒ **6〜9 回**。
- ランタイム発言 (A3/A4): 議論ログ・尋問回答・弁明・反応・真相要約。Cloud Logging の `[speaker/*]` ラベルで集計。

## 計測結果 (TODO: GEMINI_API_KEY 設定環境で実測して追記)

| 指標                                       | 値                         |
| ------------------------------------------ | -------------------------- |
| 1 ゲーム生成の平均呼び出し回数             | _TBD_                      |
| 1 ゲーム生成の平均 input / output トークン | _TBD_                      |
| 1 ゲーム生成の平均所要時間                 | _TBD_ (e2e 閾値: 60s 以内) |
| 1 ゲーム完走の総呼び出し回数               | _TBD_                      |
| 1 ゲーム完走の総トークン                   | _TBD_                      |

## 無料枠試算 (TODO: 実測トークンを入れて確定)

- gemini-2.0-flash 無料枠 (目安): RPM・1 日リクエスト数・1 分トークン数の制限内で何ゲーム回せるか。
- 1 ゲーム生成 ≒ N リクエスト / M トークン とすると、1 日あたり約 `floor(日次上限 / N)` ゲーム。
- 公開デモではバースト対策に `LLM_DAILY_REQUEST_LIMIT` を設定し、超過時はシードゲーム (P5-07) にフォールバック。

## 改善の選択肢 (結果が悪い場合)

- Generator 段階の並列化 (timeline と並行できる部分の見直し)。
- Repairer 発火を減らす (Generator プロンプト改善 = P5-02)。
- 弱モデル切替 / 発言生成のキャッシュ。
- レート制限 queue の導入。
