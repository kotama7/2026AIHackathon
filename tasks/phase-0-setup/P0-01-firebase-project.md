---
id: P0-01
title: Firebase プロジェクト作成 (dev/prod)
assignee: both
estimate_hours: 1
phase: 0
depends_on: []
labels: [infra, firestore]
---

## 概要

Firebase コンソールで dev / prod の 2 プロジェクトを作成し、Firestore (Native, asia-northeast1)、Authentication (Anonymous)、Cloud Functions、Firebase AI Logic を有効化する。

## 受け入れ条件

- [ ] `ai-village-trial-dev` と `ai-village-trial-prod` の 2 プロジェクトが存在する
- [ ] 両方で Firestore (Native, asia-northeast1) が有効
- [ ] 両方で Authentication の Anonymous プロバイダが有効
- [ ] 両方で Cloud Functions for Firebase が有効
- [ ] 両方で Firebase AI Logic (Gemini) が有効、無料枠が利用可能なことを確認
- [ ] 両者が Editor 権限で参加している

## 実装メモ

- 課金: Cloud Functions は Blaze プラン必須。Gemini 無料枠の範囲内であれば追加コストなし
- `firebase use --add` で local の alias `dev` / `prod` を設定 (P0-02 後)
