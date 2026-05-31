# P5-02 プロンプト調整 (Truth Compiler 成功率向上)

A2-13 (`test:e2e:truth-compiler`) の成功率が **80% 未満**のときに着手する。
本ファイルに before/after を記録する。

## 失敗パターンの分類

e2e の CSV (`truth-compiler-e2e.csv`) の `error` 列と、各 generator の lean schema 検証失敗・
`validateAll` の issue カテゴリで分類する。

| カテゴリ                  | 兆候                           | 主な原因                               | 効きやすい対策                                      |
| ------------------------- | ------------------------------ | -------------------------------------- | --------------------------------------------------- |
| schema 不一致             | `LLMSchemaError`               | LLM が必須フィールド欠落 / 型違い      | few-shot 例、JSON 形式の明示強化                    |
| 論理破綻 (logic)          | `validateAll` logic issue      | 同時刻多地点・到達不可・知識範囲外証言 | 隣接マトリクス/知識範囲をプロンプトに再掲、悪例注入 |
| スコア不足 (deducibility) | werewolf 7-10 / gap 2-4 を外す | weight 配分が偏る                      | スコア目標を数値で再掲、weight 例示                 |
| 動機破綻 (motivation)     | privateGoal/lieReason 欠落     | 嘘の理由が薄い                         | 「悪い嘘 (理由なし) は禁止」を強調、良例/悪例       |

## 改善方針 (効果が高い順)

1. **few-shot example の追加** — 各 generator プロンプトに「合格する出力例」を 1 つ埋める。
2. **失敗例の注入** — 直近の失敗 summary を「これは避けよ」として次プロンプトに添える
   (`validateAndRetry` の retry プロンプトは既に失敗理由を添えている)。
3. スコア/隣接/知識範囲など機械検証項目を、プロンプト末尾に箇条書きで再掲。

## before / after (TODO: GEMINI_API_KEY 設定環境で実測)

|        | 成功率 (10 連続) | 平均所要 | 主な失敗カテゴリ |
| ------ | ---------------- | -------- | ---------------- |
| before | _TBD_            | _TBD_    | _TBD_            |
| after  | _目標 80%+_      |          |                  |

## 変更ログ (TODO)

- (例) caseSkeleton プロンプトに合格 JSON の few-shot を追加 → schema 不一致が N→0。

> 注: 成功率の測定には本物の Gemini 呼び出しが必要。トリガー条件 (80% 未満) の判定自体が
> A2-13 の実測前提のため、`GEMINI_API_KEY` 設定環境で e2e を回してから着手すること。
> 現状、純ロジック検証 (schema + validateAll) はフィクスチャ/シードで 100% 通過しており、
> 失敗の主因は LLM 出力のばらつき。
