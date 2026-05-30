---
id: B3-08
title: エラーハンドリング (Functions タイムアウト / ネットワーク切断)
assignee: B
estimate_hours: 1.5
phase: 3
depends_on: [B1-05]
labels: [nextjs, ui]
---

## 概要
LLM 起因のタイムアウト・ネットワーク切断時のリトライ UI を整備。

## 受け入れ条件
- [ ] Functions エラーコード別の日本語メッセージ
  - `insufficient_points`: 「尋問ポイントが足りません」
  - `llm_failure`: 「AI 生成に失敗しました。リトライしますか?」
  - `invalid_phase`: 「現在このアクションは実行できません」
  - `unknown`: 「予期せぬエラー」
- [ ] リトライ可能なものは Toast にリトライボタン
- [ ] オフライン検知 (`navigator.onLine`) で警告バナー
- [ ] エラー時もアプリが落ちない (Error Boundary)

## 実装メモ
- React Error Boundary をルートレイアウトに
- Toast は `sonner` or 自前
