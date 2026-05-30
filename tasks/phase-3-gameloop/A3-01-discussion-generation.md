---
id: A3-01
title: 議論ログ生成 (Runtime Speaker)
assignee: A
estimate_hours: 4
phase: 3
depends_on: [A1-01, A1-02, A2-12]
labels: [llm, functions]
---

## 概要

日次の議論ログを生成。各キャラに「自分の知識 + 疑念 + 発言目的」を渡し、複数ターンの自然な対話を作る。要件 §10.3。

## 受け入れ条件

- [ ] `generateDailyDiscussion(gameId, day)` が `DialogueLog[]` を返す
- [ ] 1 日あたり 8〜12 発言、3〜5 ターン程度の流れ
- [ ] 各 LLM 呼び出しには対象キャラの `known_facts` のみ渡す (知らない情報は渡さない、要件 §13.3)
- [ ] 人狼には追加で「自分が人狼」「誘導したい処刑先」を渡す
- [ ] 出力 schema (dialogueOutputSchema) で検証
- [ ] Firestore `users/{uid}/games/{gameId}/publicLogs/` に逐次書き込み (リアルタイム反映)

## 実装メモ

- キャラごとに 1 回ずつ並列呼び出し → ターン制でループ
- 1 ターンずつ Firestore に書くことで Person B 側がストリーミング体験を実装可
- 発言中に新情報を漏らさないよう、`known_facts_used` を出力させて Functions 側で検証
