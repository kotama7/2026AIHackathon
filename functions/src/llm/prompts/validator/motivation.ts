/**
 * A2-09: 思惑整合性 LLM judge プロンプト。
 * 「各キャラの行動 (タイムライン) が public_personality / private_goal / fear と矛盾しないか」を
 * yes/no + 短い理由で判定させる軽量バッチプロンプト。
 *
 * トークン節約のため全キャラを 1 回の generateStructured 呼び出しにまとめ、
 * per-character の verdict 配列を返させる。
 */

/** judge に渡す 1 キャラ分の最小情報 (タイムライン上の行動つき)。 */
export type MotivationJudgeCharacter = {
  id: string;
  name: string;
  /** 表向きの性格 */
  publicPersonality: string;
  /** 個人的な目的 */
  privateGoal: string;
  /** 恐れていること */
  fear: string;
  /** このキャラのタイムライン上の行動 (時刻つき自由記述) */
  actions: string[];
};

export type BuildMotivationJudgePromptArgs = {
  characters: MotivationJudgeCharacter[];
};

export function buildMotivationJudgePrompt(args: BuildMotivationJudgePromptArgs): string {
  const { characters } = args;

  const blocks = characters
    .map((c) => {
      const actionList =
        c.actions.length > 0
          ? c.actions.map((a) => `    - ${a}`).join('\n')
          : '    - (行動の記録なし)';
      return `- id: ${c.id} (${c.name})
  publicPersonality: ${c.publicPersonality}
  privateGoal: ${c.privateGoal}
  fear: ${c.fear}
  行動:
${actionList}`;
    })
    .join('\n');

  return `## ロール
あなたは AI 人狼村の真相整合性チェッカー (Truth Compiler の Validator) です。
各キャラクターについて、事件夜のタイムライン上の「行動」が、その人物の
「表向きの性格 (publicPersonality)」「個人的な目的 (privateGoal)」「恐れ (fear)」と
矛盾していないか (= 思惑として自然か) を判定してください。

## 判定基準
- consistent = true: 行動が性格・目的・恐れと整合している、または特に矛盾がない。
- consistent = false: 行動が明らかにこれらと矛盾する (例: 臆病で事件を恐れる人物が自ら危険な場所へ突進する、
  目的と正反対の行動を取る、性格と全く相容れない振る舞いをする 等)。
- 判断に迷う・情報が不足している場合は true (整合) 寄りに倒し、過剰に reject しないでください。
- reason は日本語で 1 文程度の短い説明にしてください。

## 対象キャラクター
${blocks}

## 出力形式
次の JSON のみを出力してください (説明文・前置き・コードフェンス不要)。
verdicts は対象キャラクターと同数で、characterId は上記の id と一致させること:
{
  "verdicts": [
    { "characterId": "char_1", "consistent": true, "reason": "..." }
  ]
}`;
}
