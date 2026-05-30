---
id: A3-06
title: 夜間処理 (監視結果 + 襲撃実行 + 翌朝証拠)
assignee: A
estimate_hours: 3
phase: 3
depends_on: [A2-12, A1-01]
labels: [llm, functions]
---

## 概要

要件 §10.9 の夜フェーズ処理。監視対象に応じた手がかり生成、人狼の襲撃を真相通りに実行、翌朝公開する証拠/ログを追加。

## 受け入れ条件

- [ ] `processNight({ gameId, day, watchTargetId })` が `{ watchResult, nextDayEvidence, nextDayLog, gameOver? }`
- [ ] 監視対象が人狼または被害者近傍 → 重要手がかり (timeline event を一部開示)
- [ ] 監視外し → 一般的な観察ログのみ
- [ ] 人狼襲撃: 事前に caseTruth で決まっている被害者を「死亡」にマーク (Day 1 で既に被害者あり、Day 2 以降 1 名追加 if 設定)
- [ ] 翌朝公開する追加証拠 (1〜2 枚) を Firestore に書き込み
- [ ] 翌朝の初期議論ログを A3-01 と同じ仕組みで生成 (Functions 内で呼び出し)

## 実装メモ

- MVP では被害者は Day 1 のみ固定。Day 2/3 で人狼が追加襲撃するかは設計判断 → 当面は追加襲撃なし、推理時間中心
- gameOver 条件: 村人生存数 ≤ 2 等
