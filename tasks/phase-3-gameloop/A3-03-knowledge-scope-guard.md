---
id: A3-03
title: 知識範囲ガード (LLM 出力照合)
assignee: A
estimate_hours: 2
phase: 3
depends_on: [A3-01, A3-02]
labels: [llm, functions]
---

## 概要
LLM 発言が「キャラが知るはずのない情報」を含んでいたら自動で再生成。要件 §4.4 「LLM の生成ミスをゲーム内の嘘として扱わない」。

## 受け入れ条件
- [ ] `enforceKnowledgeScope(output, character, caseTruth)` が違反 fact 一覧を返す
- [ ] 出力テキストに含まれる固有名詞 / 時刻 / 場所を抽出
- [ ] 各情報が `character.known_facts` または公開情報に含まれるか確認
- [ ] 違反があれば「以下の情報は知らないはずです: ...」を添えて再生成 (最大 2 回)
- [ ] 単体テスト: 違反検出、合格ケース

## 実装メモ
- 完全な NER は難しいので、ホワイトリスト方式: 「事前に決めた要注意キーワード (人狼の正体、被害者の秘密等) を含むか」だけチェック
- LLM judge で「この発言は character が知っている情報のみで説明可能か?」を yes/no 評価する補強案も検討
