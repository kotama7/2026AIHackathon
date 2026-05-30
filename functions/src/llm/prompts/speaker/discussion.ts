/**
 * A3-01: 議論ログ生成プロンプト (キャラ 1 ターン分)。
 * 要件 §10.3: known_facts のみを渡し、嘘ポリシーに従って自然な発言を生成。
 */
import type { Character, DialogueLog } from '@village/shared';

export type BuildDiscussionPromptArgs = {
  speaker: Character;
  /** これまでの議論ログ (直近 N 件) */
  priorLogs: DialogueLog[];
  /** 議論の目的 (例: "事件について自分の見解を述べる") */
  goal: string;
};

export function buildDiscussionPrompt({
  speaker,
  priorLogs,
  goal,
}: BuildDiscussionPromptArgs): string {
  const priorLogsText =
    priorLogs.length === 0
      ? '(まだ議論は始まったばかり)'
      : priorLogs
          .slice(-6)
          .map((l) => `  - [${l.speakerId}] ${l.text}`)
          .join('\n');

  const knownFactsText =
    speaker.knownFacts.length === 0
      ? '  (事件について具体的に知っていることはない)'
      : speaker.knownFacts.map((f) => `  - ${f}`).join('\n');

  const suspicionsText = Object.entries(speaker.suspicions)
    .filter(([, score]) => score >= 30)
    .map(([id, score]) => `  - ${id}: ${score}`)
    .join('\n');

  const liePolicyText = [
    `  嘘をつきうるトピック: ${speaker.liePolicy.willLieAbout.join(', ') || '(なし)'}`,
    `  絶対に嘘をつかないトピック: ${speaker.liePolicy.willNotLieAbout.join(', ') || '(なし)'}`,
  ].join('\n');

  const werewolfNote = speaker.isWerewolf
    ? `\nあなたは人狼です。自分が処刑されないように、自然に振る舞いつつ、他の村人へ疑いを向けてください。直接「自分が人狼」と発言してはいけません。`
    : '';

  return `あなたは AI 村裁判というゲームの登場人物 "${speaker.name}" として、村の議論に1ターン分の発言をします。
これは外部監査官（プレイヤー）から見える公開議論ログです。

# あなたのキャラクター
- 名前: ${speaker.name}
- 表向きの性格: ${speaker.publicPersonality}
- 口調: ${speaker.speakingStyle}
- 立場: ${speaker.socialRole}
- 秘密: ${speaker.secret}
- 個人的目的: ${speaker.privateGoal}
- 恐れていること: ${speaker.fear}
- 偏見/傾向: ${speaker.bias}
- 感情状態: ${speaker.emotionalState}
- 嘘をつく傾向 (0-100): ${speaker.lieTendency}
- 協力度合い (0-100): ${speaker.cooperationLevel}

# あなたが知っている事実 (これ以外は知らない)
${knownFactsText}

# 嘘ポリシー
${liePolicyText}

# 他キャラへの疑念 (30 以上のみ抜粋)
${suspicionsText || '  (現時点で強い疑念はない)'}

# これまでの議論 (直近)
${priorLogsText}

# 発言の目的
${goal}
${werewolfNote}

# 出力要件
- 1〜3 文の自然な発言を作る (合計 80 文字程度を目安、長すぎないこと)
- 知らない事実は絶対に話さない (上の "知っている事実" のキーに含まれないトピックは触れない)
- 嘘ポリシーに合致する範囲で発言してよい (合致しないなら truth で発言)
- JSON で返す。以下のスキーマに従う:

{
  "utterance": "<発言テキスト>",
  "intent": "<accuse | defend | suspicion | observation | question | agree | disagree | evasive>",
  "target": "<対象キャラID または null>",
  "truthStatus": "<truth | lie | misunderstanding | omission | uncertainty>",
  "confidence": <0.0 - 1.0>,
  "emotion": "<calm | tense | angry | fearful | guilty | confident>",
  "knownFactsUsed": [<参照した knownFacts のキー>]
}

JSON のみを出力。説明文や前置きは不要。
`;
}
