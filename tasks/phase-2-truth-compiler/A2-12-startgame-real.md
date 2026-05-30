---
id: A2-12
title: startNewGame 本実装に差し替え
assignee: A
estimate_hours: 2
phase: 2
depends_on: [A2-11, A1-04]
labels: [functions, firestore]
---

## 概要

A1-05 のスタブを Truth Compiler 実呼び出しに差し替え。生成された CaseTruth を `internal/`、公開部分を `users/{uid}/games/` に書き込み。

## 受け入れ条件

- [ ] `compileCaseTruth` を呼び、合格したものを保存
- [ ] `internal/{gameId}/caseTruth`、`internal/{gameId}/characterSecrets/{charId}`、`internal/{gameId}/timeline/{eventId}` に分割保存
- [ ] `users/{uid}/games/{gameId}/meta` (day=1, phase=morning, remainingPoints=5, status=in_progress)
- [ ] `users/{uid}/games/{gameId}/characters/{charId}` は `CharacterPublic` のみ (secret 等は省く)
- [ ] 1 日目の証拠 (3 枚) と初期議論ログ (5 件) を `users/.../evidence` と `users/.../publicLogs` に書き込み
- [ ] 初期議論ログ生成は A3-01 に依存するため、それまでは placeholder 文 (「事件についての噂が広まっている」) で OK

## 実装メモ

- Functions のメモリ 1GB、timeout 540s 設定 (Truth Compiler は重い)
- 失敗時は user に「事件構築に失敗。シードゲームを起動しますか?」と P5-07 のフォールバックを返す option
