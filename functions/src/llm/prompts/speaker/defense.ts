/**
 * A4-01: 弁明生成プロンプト。
 * 容疑者が人狼か村人かで戦略を分ける。
 */
import type { Character, Evidence, Testimony } from '@village/shared';

export type BuildDefensePromptArgs = {
  suspect: Character;
  presentedEvidence: Evidence[];
  presentedContradictions: Testimony[];
};

export function buildDefensePrompt({
  suspect,
  presentedEvidence,
  presentedContradictions,
}: BuildDefensePromptArgs): string {
  const evidenceText =
    presentedEvidence.length === 0
      ? '  (提示された物的証拠はない)'
      : presentedEvidence
          .map((e) => `  - 「${e.name}」: ${e.description} (信頼性 ${e.reliability})`)
          .join('\n');

  const contradictionsText =
    presentedContradictions.length === 0
      ? '  (提示された矛盾はない)'
      : presentedContradictions.map((t) => `  - "${t.text}" (Day${t.day} の発言)`).join('\n');

  const knownFactsText =
    suspect.knownFacts.length === 0
      ? '  (具体的に知っている事実はない)'
      : suspect.knownFacts.map((f) => `  - ${f}`).join('\n');

  const liePolicyText = [
    `  嘘をつきうるトピック: ${suspect.liePolicy.willLieAbout.join(', ') || '(なし)'}`,
    `  絶対に嘘をつかないトピック: ${suspect.liePolicy.willNotLieAbout.join(', ') || '(なし)'}`,
  ].join('\n');

  const roleStrategy = suspect.isWerewolf
    ? `# 戦略 (人狼)
あなたは人狼ですが、裁判で告発されました。次のいずれかで切り抜けてください:
- 提示された証拠を別解釈に持っていく (例: 「その時間に現場にいたのは別の理由」)
- レッドヘリングへ誘導 (他の不審なキャラへ視線を流す)
- 過去の自分の発言と整合させながら冷静に反論
ただし破綻が明白な場合は、悔しさや動揺を見せて感情的に否定。`
    : `# 戦略 (村人)
あなたは村人ですが、誤って告発されています。
- 自分の secret は可能な限り守りつつ、自分が無実である根拠を訴える
- lie_policy が許す範囲で隠したい事実は隠してよい
- 提示された矛盾には個別に反論し、思い違いや状況の説明で解消する
- 感情は「不当に疑われた怒り」「証拠不足への困惑」など自然に。`;

  return `あなたは AI 村裁判の登場人物 "${suspect.name}" として、裁判で容疑者の弁明を述べます。
これは外部監査官（プレイヤー）と全村人の前で読み上げられる、ゲーム上最も重要な発言の 1 つです。

# あなたのキャラクター
- 名前: ${suspect.name}
- 表向きの性格: ${suspect.publicPersonality}
- 口調: ${suspect.speakingStyle}
- 立場: ${suspect.socialRole}
- 秘密: ${suspect.secret}
- 個人的目的: ${suspect.privateGoal}
- 恐れていること: ${suspect.fear}
- 偏見/傾向: ${suspect.bias}
- 感情状態: ${suspect.emotionalState}

# あなたが知っている事実 (これ以外は知らない)
${knownFactsText}

# 嘘ポリシー
${liePolicyText}

# 検察側 (プレイヤー) が提示した証拠
${evidenceText}

# 検察側が提示した矛盾
${contradictionsText}

${roleStrategy}

# 出力要件
- 弁明は 2〜4 段落、合計 200〜400 文字程度
- 提示された証拠と矛盾それぞれに、対応する反論または受け入れを盛り込む
- 感情を伴った自然な発話 (emotion field と一致)
- JSON で返す:

{
  "utterance": "<弁明テキスト全文 (改行 \\n 可)>",
  "intent": "defend",
  "target": null,
  "truthStatus": "<truth | lie | misunderstanding | omission | uncertainty>",
  "confidence": <0.0 - 1.0>,
  "emotion": "<calm | tense | angry | fearful | guilty | confident>",
  "knownFactsUsed": [<参照した knownFacts のキー>]
}

JSON のみを出力。
`;
}
