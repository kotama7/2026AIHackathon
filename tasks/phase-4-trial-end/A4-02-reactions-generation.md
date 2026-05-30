---
id: A4-02
title: 他キャラ反応生成 (弁明への支持 / 異議)
assignee: A
estimate_hours: 2
phase: 4
depends_on: [A1-01, A2-12]
labels: [llm, functions]
---

## 概要
弁明後、他のキャラ (生存者) が短く反応する。bias / relationship に従って支持 or 異議。

## 受け入れ条件
- [ ] `generateReactions({ gameId, suspectId, defense })` が `{ characterId, text, stance: 'support'|'oppose'|'neutral' }[]` を返す
- [ ] 生存キャラ全員から 1 発言ずつ (容疑者本人除く)
- [ ] 各キャラの bias / relationship を context に
- [ ] 1 反応は 1〜2 文の短さ
- [ ] 知識範囲ガード (A3-03) 適用

## 実装メモ
- 並列 LLM 呼び出しでレイテンシ短縮
- 人狼が容疑者で他キャラが疑っているケース: 反応の濃淡が物語性を作る
