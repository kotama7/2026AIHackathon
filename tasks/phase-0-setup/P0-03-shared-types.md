---
id: P0-03
title: 共有型定義 (packages/shared/types)
assignee: both
estimate_hours: 3
phase: 0
depends_on: [P0-02]
labels: [types]
---

## 概要

要件定義書 §12 のデータモデルをすべて TypeScript 型として `packages/shared/src/types/` に定義する。両者がここを唯一の真実源として import する。

## 受け入れ条件

- [ ] 以下の型がすべて定義されている: `CaseTruth`, `Character`, `CharacterPublic` (UI 表示用、secret 除外), `TimelineEvent`, `Evidence`, `Testimony`, `DialogueLog`, `InterrogationAction`, `DeductionPath`, `DeductionStep`, `TrialDecision`
- [ ] MVP 追加型: `GameMeta` (`currentDay`, `currentPhase`, `remainingPoints`, `aliveCharacters[]`, `villageTrust`, `status`)
- [ ] `QuestionType = 'normal' | 'deep_dive' | 'evidence' | 'contradiction' | 'force_testimony'` および各コスト定数
- [ ] `EvidenceCategory = 'confirmatory' | 'supporting' | 'noise'`
- [ ] `TruthStatus = 'truth' | 'lie' | 'misunderstanding' | 'omission' | 'uncertainty'`
- [ ] `packages/shared/src/index.ts` から全部 re-export
- [ ] `apps/web` と `functions` の両方から import して typecheck が通る

## 実装メモ

- 公開用 (Firestore 公開コレクション) と内部用 (Functions 専用) は型レベルで分ける: `CharacterPublic` vs `Character`
- Firestore Timestamp は `import type { Timestamp } from 'firebase/firestore'` (web) と Admin の Timestamp で型互換の差異あり → `unknown` 経由か `FirebaseTimestamp` という共通エイリアスを切る
