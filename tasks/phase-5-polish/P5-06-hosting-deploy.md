---
id: P5-06
title: Firebase Hosting 本番デプロイ
assignee: both
estimate_hours: 2
phase: 5
depends_on: [B4-04, A4-06]
labels: [infra, ci]
---

## 概要
Next.js を Firebase Hosting に SSR でデプロイ。Functions も prod プロジェクトへ。

## 受け入れ条件
- [ ] `firebase experiments:enable webframeworks` 有効化
- [ ] `firebase deploy --only hosting,functions --project prod` が通る
- [ ] 本番 URL でタイトル → 新規ゲーム → 完走できる
- [ ] GitHub Actions に `deploy.yml` (main マージ時に自動デプロイ、PR は preview channel)
- [ ] env: `GEMINI_API_KEY` は Secret Manager (prod プロジェクト) に設定済み
- [ ] DNS / カスタムドメインは任意

## 実装メモ
- `FirebaseExtended/action-hosting-deploy` でプレビュー URL の自動投稿
- Functions は Node 20 ランタイム
