---
id: B3-03
title: 尋問ポイント UI (バー + 不足時 disabled)
assignee: B
estimate_hours: 1
phase: 3
depends_on: [B3-02, B2-07]
labels: [ui]
---

## 概要
残ポイントを視覚化、コスト超過の質問は disabled + tooltip でエラー理由表示。

## 受け入れ条件
- [ ] ナビ (B2-07) の pip 表示と尋問画面 (B3-02) のアクションボタンが連動
- [ ] 残量 < cost の質問は disabled + 「あと X ポイント必要」tooltip
- [ ] 残量変化を 500ms のアニメーションで滑らかに反映
- [ ] ポイント 0 時の専用メッセージ「今日はもう尋問できません。裁判または夜へ進んでください」

## 実装メモ
- Zustand store の `remainingPoints` を参照、Firestore listener (B2-08) 経由で更新
