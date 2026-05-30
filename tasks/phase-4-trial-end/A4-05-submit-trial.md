---
id: A4-05
title: submitTrialDecision callable 完成
assignee: A
estimate_hours: 1
phase: 4
depends_on: [A4-01, A4-02, A4-03]
labels: [functions]
---

## 概要
A4-01 / A4-02 / A4-03 を統合した callable。Person B の裁判画面はこの callable のみを叩く。

## 受け入れ条件
- [ ] 入力検証 (フェーズが trial、提示証拠数 ≤ 3、矛盾 ≤ 2)
- [ ] A4-01 で弁明、A4-02 で反応生成 (両方とも結果を返す前にこのレスポンスに含める)
- [ ] A4-03 で判決処理
- [ ] レスポンス: `{ defense, reactions, outcome: 'continue'|'won'|'lost' }`
- [ ] 全体レイテンシ目標 15 秒以内

## 実装メモ
- 弁明 + 反応を逐次的に Firestore に書いてストリーミング体験にする選択肢あり (要 UI 連携)
- MVP は同期返却で OK、後で改善
