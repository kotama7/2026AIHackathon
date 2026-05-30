---
id: A3-08
title: submitInterrogation callable 完成
assignee: A
estimate_hours: 1
phase: 3
depends_on: [A3-02, A3-03, A3-04, A3-05]
labels: [functions]
---

## 概要

A3-02 / A3-03 / A3-04 / A3-05 を組み合わせて、`submitInterrogation` の完成版を実装。

## 受け入れ条件

- [ ] 入力検証 (現在フェーズが investigation か、対象が生存か)
- [ ] ポイント消費 (A3-05) → 失敗時は早期 return
- [ ] 回答生成 (A3-02) + 知識ガード (A3-03)
- [ ] 信頼度更新 (A3-04)
- [ ] Firestore `interrogations/{id}` に履歴保存
- [ ] レスポンスに answer / trustDelta / remainingPoints を含める

## 実装メモ

- 一連の処理は最大 10 秒以内が目標 (LLM 1 回 + 軽い更新)
- エラーは構造化して Person B 側で UI 化しやすく
