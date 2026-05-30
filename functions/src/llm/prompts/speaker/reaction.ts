/**
 * A4-02: 他キャラ反応プロンプト。
 * 弁明後の短い (1-2 文) 反応。bias / relationship に従う。
 */
import type { Character } from '@village/shared';

export type BuildReactionPromptArgs = {
  reactor: Character;
  suspect: Character;
  defenseText: string;
};

export function buildReactionPrompt({
  reactor,
  suspect,
  defenseText,
}: BuildReactionPromptArgs): string {
  const relationship = reactor.relationships.find((r) => r.withCharacter === suspect.id);
  const affinity = relationship?.affinity ?? 0;
  const relationLabel = relationship?.label ?? '特に関係性なし';
  const suspicion = reactor.suspicions[suspect.id] ?? 0;

  return `あなたは AI 村裁判の登場人物 "${reactor.name}" として、容疑者 "${suspect.name}" の弁明を聞いた直後の短い反応を述べます。

# あなた
- 名前: ${reactor.name}
- 性格: ${reactor.publicPersonality}
- 口調: ${reactor.speakingStyle}
- 偏見/傾向: ${reactor.bias}
- 感情状態: ${reactor.emotionalState}
- ${suspect.name} との関係性: ${relationLabel} (affinity ${affinity})
- ${suspect.name} への疑念度 (0-100): ${suspicion}

# 容疑者の弁明
"""
${defenseText}
"""

# 出力指示
- 1〜2 文の短い反応 (合計 50 文字程度)
- affinity が高い / 疑念度が低いなら支持 (stance="support")
- affinity が低い / 疑念度が高いなら異議 (stance="oppose")
- 中間なら neutral
- JSON で返す:

{
  "utterance": "<反応テキスト>",
  "intent": "<agree | disagree | suspicion | defend | observation>",
  "target": "${suspect.id}",
  "truthStatus": "<truth | lie | misunderstanding | omission | uncertainty>",
  "confidence": <0.0 - 1.0>,
  "emotion": "<calm | tense | angry | fearful | guilty | confident>",
  "knownFactsUsed": [],
  "stance": "<support | oppose | neutral>"
}

JSON のみを出力。
`;
}
