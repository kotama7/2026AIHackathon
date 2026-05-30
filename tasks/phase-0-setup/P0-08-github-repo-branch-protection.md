---
id: P0-08
title: GitHub repo + ブランチ保護 + PR テンプレ
assignee: both
estimate_hours: 1
phase: 0
depends_on: []
labels: [infra, ci]
---

## 概要
GitHub リポジトリのブランチ保護、PR テンプレート、必須 Secrets / Variables の設定。

## 受け入れ条件
- [ ] `main` ブランチに保護ルール: PR 必須、approve 1 件以上、CI 通過必須、force push 禁止
- [ ] `.github/pull_request_template.md` 作成 (概要 / 関連 Issue / テスト方法 / スクリーンショット欄)
- [ ] `.github/ISSUE_TEMPLATE/` は不要 (タスクは tasks/ から自動生成のため)
- [ ] Settings → Secrets and variables → Actions → Variables に `GITHUB_USER_A`, `GITHUB_USER_B` を設定
- [ ] Settings → Secrets → `FIREBASE_TOKEN` (デプロイ用、後でも OK)
- [ ] Issues 機能が有効、Projects (v2) "AI村裁判 開発" を作成

## 実装メモ
- 担当者 GitHub username が決まったら Variables 設定 → sync-tasks.yml が assignee を付ける
