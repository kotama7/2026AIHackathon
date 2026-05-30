---
id: P0-05
title: zod スキーマ初稿 (LLM 出力検証用)
assignee: both
estimate_hours: 2
phase: 0
depends_on: [P0-03]
labels: [types, llm]
---

## 概要

LLM 出力検証と Firestore データ整合性チェックに使う zod スキーマを `packages/shared/src/schemas/` に置く。型は zod から `z.infer` で派生させて P0-03 と一致させる。

## 受け入れ条件

- [ ] `caseTruthSchema`, `characterSchema`, `evidenceSchema`, `testimonySchema`, `deductionPathSchema` を定義
- [ ] LLM 発言出力 `dialogueOutputSchema` (utterance, intent, target, truth_status, confidence, emotion)
- [ ] `z.infer<typeof X>` が P0-03 の手書き型と互換 (テストで確認)
- [ ] zod 4.x または 3.x の最新版を採用
- [ ] エクスポート: `packages/shared/src/index.ts` から `* as schemas`

## 実装メモ

- 真相整合性検証用の高レベル zod (例: `evidence[].points_to が character[].id を参照` のような関係検証) は `superRefine` で
- Firestore Timestamp は `z.custom()` でラップ
