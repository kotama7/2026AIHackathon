# P5-01 バランス調整ノート

通しプレイ (両者クロスプレイ 5〜10 回) の結果をここに記録する。
バランス定数はすべて `packages/shared/src/constants/index.ts` に集約済み。調整はこの 1 ファイルで完結する。

## 調整レバー (現在値)

| 定数                                                | 現在値                | 効果                 | 上げると            |
| --------------------------------------------------- | --------------------- | -------------------- | ------------------- |
| `INITIAL_INTERROGATION_POINTS`                      | 5                     | 1 日の尋問回数       | 情報が増え易化      |
| `QUESTION_COSTS.normal`                             | 1                     | 通常質問             | 高=回数減           |
| `QUESTION_COSTS.deep_dive`                          | 2                     | 深掘り               |                     |
| `QUESTION_COSTS.contradiction`                      | 2                     | 矛盾追及             |                     |
| `QUESTION_COSTS.force_testimony`                    | 3                     | 強制証言             |                     |
| `DEDUCIBILITY_THRESHOLDS.WEREWOLF_SCORE_MIN/MAX`    | 7 / 10                | 真犯人の証拠強度     | 高=人狼が目立ち易化 |
| `DEDUCIBILITY_THRESHOLDS.RED_HERRING_SCORE_MIN/MAX` | 4 / 6                 | レッドヘリングの強さ | 高=誤誘導強く難化   |
| `DEDUCIBILITY_THRESHOLDS.GAP_MIN/MAX`               | 2 / 4                 | 真犯人と冤罪候補の差 | 高=易化             |
| `TRUST_DELTAS.CORRECT_CONTRADICTION`                | target+5 / village+3  | 正しい矛盾指摘       |                     |
| `TRUST_DELTAS.WRONG_ACCUSATION`                     | target-10 / village-5 | 誤った疑い           |                     |
| `TRUST_DELTAS.EXECUTE_WEREWOLF`                     | village+20            | 人狼処刑             |                     |
| `TRUST_DELTAS.EXECUTE_VILLAGER`                     | village-30            | 冤罪処刑             |                     |
| `LOSE_THRESHOLDS.MIN_ALIVE_VILLAGERS`               | 2                     | 村人壊滅の閾値       |                     |
| `LOSE_THRESHOLDS.MIN_VILLAGE_TRUST`                 | 20                    | 信頼度崩壊の閾値     |                     |

スコアランク S/A/B/C/D の閾値は `functions/src/gameLoop/score.ts` を参照。

## 測定手順

1. 両者で各 3 回以上、難易度 normal で通しプレイ (`useSeed:false` の本生成)。
2. 各プレイで記録: 人狼を当てられたか / 経過日数 / 残尋問ポイント / 最終ランク / 「証拠が足りない/多い」体感。
3. 下表に追記。

## プレイ記録 (TODO: 実プレイ後に追記)

| #   | プレイヤー | 難易度 | 結果 | 日数 | 余りポイント | ランク | 所感 |
| --- | ---------- | ------ | ---- | ---- | ------------ | ------ | ---- |
| 1   |            | normal |      |      |              |        |      |

## 調整履歴 (TODO)

- (例) 「人狼が当てられない」が 3/5 → `GAP_MIN` を 2→3 に引き上げ、`RED_HERRING_SCORE_MAX` を 6→5 に。

> 注: 本ノートのプレイ記録は実機での通しプレイが前提。LLM 生成 (本物の Gemini) が必要なため、
> `GEMINI_API_KEY` 設定済み環境での手動プレイで埋めること。
