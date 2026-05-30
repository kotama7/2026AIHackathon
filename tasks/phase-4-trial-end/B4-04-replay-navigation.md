---
id: B4-04
title: 「もう一度プレイ」「タイトルに戻る」導線
assignee: B
estimate_hours: 1
phase: 4
depends_on: [B4-02]
labels: [ui]
---

## 概要
結果画面からの遷移。新規ゲーム or タイトルに戻る。

## 受け入れ条件
- [ ] 「もう一度プレイ」→ Zustand reset + `/` に戻り即座に新規ゲーム開始
- [ ] 「タイトルに戻る」→ `/` に戻るだけ (履歴に保存済み)
- [ ] 「結果をシェア」(任意): URL コピー (将来用、MVP は disabled で OK)

## 実装メモ
- 履歴は Firestore に自動保存済み、何もしなくて OK
- シェアは V2 で
