/**
 * A3-02: 尋問回答プロンプト。
 * QuestionType ごとに分岐: normal / deep_dive / evidence / contradiction / force_testimony。
 */
import type { Character, Evidence, QuestionType, Testimony } from '@village/shared';

export type BuildInterrogationPromptArgs = {
  target: Character;
  questionType: QuestionType;
  questionText: string;
  /** evidence 提示型でのみ */
  presentedEvidence?: Evidence;
  /** contradiction 追及型でのみ */
  presentedContradictions?: Testimony[];
  /** target の過去発言 (整合性ガード用) */
  pastUtterances: string[];
};

export function buildInterrogationPrompt({
  target,
  questionType,
  questionText,
  presentedEvidence,
  presentedContradictions,
  pastUtterances,
}: BuildInterrogationPromptArgs): string {
  const knownFactsText =
    target.knownFacts.length === 0
      ? '  (具体的な事件知識はない)'
      : target.knownFacts.map((f) => `  - ${f}`).join('\n');

  const liePolicyText = [
    `  嘘をつきうるトピック: ${target.liePolicy.willLieAbout.join(', ') || '(なし)'}`,
    `  絶対に嘘をつかないトピック: ${target.liePolicy.willNotLieAbout.join(', ') || '(なし)'}`,
  ].join('\n');

  const pastText =
    pastUtterances.length === 0
      ? '  (まだ発言なし)'
      : pastUtterances
          .slice(-5)
          .map((t) => `  - ${t}`)
          .join('\n');

  const questionTypeInstruction = buildQuestionTypeInstruction({
    questionType,
    presentedEvidence,
    presentedContradictions,
  });

  const werewolfNote = target.isWerewolf
    ? `\nあなたは人狼です。嘘をついて自分の正体を守ることを最優先。ただし破綻が明白なら不利な truth で逃げてもよい。`
    : '\nあなたは村人です。基本的に知っていることを正直に話しますが、嘘ポリシーで隠したい事項は隠してよいです。';

  return `あなたは AI 村裁判の登場人物 "${target.name}" として、外部監査官（プレイヤー）の尋問に答えます。

# あなたのキャラクター
- 名前: ${target.name}
- 表向きの性格: ${target.publicPersonality}
- 口調: ${target.speakingStyle}
- 立場: ${target.socialRole}
- 秘密: ${target.secret}
- 個人的目的: ${target.privateGoal}
- 恐れていること: ${target.fear}
- 偏見/傾向: ${target.bias}
- 感情状態: ${target.emotionalState}
- 嘘をつく傾向 (0-100): ${target.lieTendency}

# あなたが知っている事実 (これ以外は知らない)
${knownFactsText}

# 嘘ポリシー
${liePolicyText}

# 過去の自分の発言 (矛盾しないこと)
${pastText}
${werewolfNote}

# 尋問内容
- 質問タイプ: ${questionType}
- 質問本文: "${questionText || '(本文なし)'}"

${questionTypeInstruction}

# 出力要件
- 1〜3 文の自然な回答 (合計 80 文字程度を目安)
- 知らない事実は絶対に持ち出さない
- 過去の自分の発言と矛盾しないこと
- JSON で返す:

{
  "utterance": "<回答テキスト>",
  "intent": "<accuse | defend | suspicion | observation | question | agree | disagree | evasive>",
  "target": "<対象キャラID または null>",
  "truthStatus": "<truth | lie | misunderstanding | omission | uncertainty>",
  "confidence": <0.0 - 1.0>,
  "emotion": "<calm | tense | angry | fearful | guilty | confident>",
  "knownFactsUsed": [<参照した knownFacts のキー>]
}

JSON のみを出力。
`;
}

function buildQuestionTypeInstruction(args: {
  questionType: QuestionType;
  presentedEvidence?: Evidence;
  presentedContradictions?: Testimony[];
}): string {
  switch (args.questionType) {
    case 'normal':
      return `# 回答方針: normal
通常質問。事件についての自分の見解を、知っている範囲で簡潔に述べてください。`;
    case 'deep_dive':
      return `# 回答方針: deep_dive
深掘り質問。表面的な返答ではなく、自分の視点・推測・観察をより具体的に述べてください。
ただし知らないことは知らないと言ってよいです。`;
    case 'evidence': {
      const ev = args.presentedEvidence;
      const evText = ev
        ? `提示された証拠: 「${ev.name}」 - ${ev.description} (信頼性: ${ev.reliability})`
        : '提示された証拠: (なし)';
      return `# 回答方針: evidence
証拠提示型。プレイヤーが具体的な物的証拠を突きつけてきました。
${evText}

嘘ポリシーが許す範囲で「知らない」「誤解だ」と返してもよいが、
証拠が決定的なら lie を維持するか truth に転じるかを emotional に決断してください。
あなたが人狼で、かつこの証拠で破綻するなら逃げの台詞を。`;
    }
    case 'contradiction': {
      const cs = args.presentedContradictions ?? [];
      const csText =
        cs.length === 0
          ? '提示された矛盾: (なし)'
          : cs.map((t) => `  - "${t.text}" (Day${t.day} の発言)`).join('\n');
      return `# 回答方針: contradiction
矛盾追及型。プレイヤーが過去の証言との矛盾を指摘してきました。
${csText}

破綻が明確なら認める方向で、まだ言い逃れができるなら別の説明を試みてください。
あなたが嘘をついている当事者なら、感情 (動揺・怒り・諦め) が表に出ます。`;
    }
    case 'force_testimony':
      return `# 回答方針: force_testimony
強制証言。プレイヤーがあなたの発言を強い圧で求めてきました。
不快感・反感を覚えつつも、発言を絞り出してください。
intent は 'evasive' か 'defend' になりやすく、emotion は 'angry' か 'fearful'。`;
  }
}
