---
id: A3-00
title: フェーズ前進オーケストレーション (advancePhase callable + 導線)
assignee: A
estimate_hours: 4
phase: 3
depends_on: [A2-12]
labels: [functions, gameloop, ui]
---

## 背景 / なぜ必要か

タスク分解の欠落。各フェーズ内の処理 (A3-01 議論生成 / A3-08 尋問 / A4-05 裁判 / A3-09 夜) は
定義されているが、**`meta.currentPhase` を 朝→議論→調査→整理→裁判→夜→(翌朝/終了) と前進させる
“状態遷移の主体”** がどのタスクにも無い (`advanceToTrial` は P0-04 に契約のみ、実装タスク無し)。

- B3-07 は遷移“演出”で、phase 変化を購読するだけ＝誰も phase を変えないと発火しない。
- A3-08 は「phase==investigation 前提」だが investigation へ遷移する処理が存在しない。
- 結果、新規/シードゲームは `morning` で固定され、プレイヤーが先へ進めない。

クライアントは `meta` を直接書けない (firestore.rules: meta write=false) ため、**前進は必ず
サーバ callable 経由**で行う。

## 設計

### フェーズ状態機械

```
morning → discussion → investigation → organize → trial → night → (翌朝 morning / result)
```

- `night` 完了時: 勝敗判定 (A3-07)。決着なら `result`、未決着なら `currentDay++` して `morning`。
- 各遷移は **決定論的に即実行** (LLM 非依存)。フェーズ進入時の生成 (議論/夜手がかり等) は
  **ベストエフォート**: LLM 成否に関わらず phase は前進させ、生成失敗は warning ログ + 既存
  プレースホルダで継続 (無料枠 quota でゲームが詰まらないようにする)。

### API: `advancePhase` callable

- req: `{ gameId: string }`
- res: `{ meta: GameMeta, phase: GamePhase }`
- 検証: auth 必須 / 自分の game / status==in_progress
- 処理: 現 phase → 次 phase を算出し `meta` を更新。night→朝/result は勝敗判定を挟む。
- 冪等性: 既に同 phase なら no-op で現 meta を返す。

### クライアント導線

- `GameNav` ヘッダに **「次へ進む ▶」ボタン** (現フェーズに応じてラベル可変:
  「議論を始める」「調査へ」「裁判へ」「夜へ」「次の日へ」)。
- 押下で `callAdvancePhase` → meta 更新 → 該当タブへ遷移。
- result 到達時は「結果を見る」。

## 受け入れ条件 (MVP)

- [ ] `advancePhase({gameId})` が phase を 1 段階前進させ Firestore `meta` を更新
- [ ] morning→discussion→investigation→organize→trial→night→(morning|result) を一巡できる
- [ ] night で勝敗判定し、決着で result / 未決着で翌日 morning
- [ ] GameNav に「次へ進む」導線、現フェーズに応じたラベル
- [ ] LLM 生成は best-effort (失敗しても phase は進む)。決定論部分は quota 非依存で動く
- [ ] シードゲームで 朝→…→結果 まで手動進行できる (LLM アクション未使用でも完走)

## 段階実装

1. **MVP (本タスク)**: 決定論的 `advancePhase` + 「次へ進む」導線。タブ解放・一巡可能に。
2. 各フェーズ進入時の生成を接続: 議論 (A3-01) / 夜手がかり (A3-06)。LLM・要 Gemini 枠。
3. 尋問 (A3-08) / 裁判 (A4-05) のアクションを各画面で完成 (既に callable 枠あり)。

## 実装メモ

- `meta.currentPhase` / `currentDay` は `GameMeta` (packages/shared/types)。
- 勝敗判定は A3-07 (`win-lose-engine`) を流用予定。MVP では「人狼全滅=勝利 / 村人が一定以下=敗北 /
  それ以外=継続」の簡易版でも可。
- contracts: `packages/shared` の `FunctionContracts` に `advancePhase` を追加し、
  `apps/web/src/lib/firebase/functions.ts` と mock に wrapper を足す。
