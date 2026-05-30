/**
 * A4-06: 真相サマリー生成プロンプト。
 * 結末画面で読み上げる、簡潔で物語的な事件の真相。
 */
import type { CaseTruth } from '@village/shared';

export type BuildTruthSummaryPromptArgs = {
  caseTruth: CaseTruth;
  /** ゲーム結果 (won / lost_* / corrupted) — 結末のトーンを決める */
  outcome: 'won' | 'lost_werewolf_survived' | 'lost_too_few_villagers' | 'lost_trust_collapsed';
};

export function buildTruthSummaryPrompt({
  caseTruth,
  outcome,
}: BuildTruthSummaryPromptArgs): string {
  const werewolfName =
    caseTruth.characters.find((c) => c.id === caseTruth.summary.werewolfId)?.name ?? '人狼';
  const victimName =
    caseTruth.characters.find((c) => c.id === caseTruth.summary.victimId)?.name ?? '被害者';

  const outcomeText = {
    won: 'プレイヤーは人狼を正しく見抜き、村は救われた。',
    lost_werewolf_survived: '人狼は逃げ切り、村は恐怖の中で次の夜を迎えることになった。',
    lost_too_few_villagers: '生存する村人が少なくなりすぎ、村は機能を失った。',
    lost_trust_collapsed: '村人同士の信頼が崩壊し、もはや誰も誰を信じられなくなった。',
  }[outcome];

  return `あなたは AI 村裁判の物語結末を語る語り部です。

# 事件の真相
- 犯人 (人狼): ${werewolfName}
- 被害者: ${victimName}
- 犯行時刻: ${caseTruth.summary.attackTime}
- 犯行場所: ${caseTruth.summary.attackLocation}
- 真相の論理: ${caseTruth.summary.solutionLogic}

# プレイヤーの結末
${outcomeText}

# 出力指示
- 4〜6 文の物語的な結末を書く (合計 200 文字程度)
- 「事件の核心は…だった」「もし…なら…」のように、プレイヤーが見落とした可能性にも軽く触れてよい
- ネタバレを恐れず、犯人 / 動機 / 鍵となる証拠を明示する
- JSON ではなく、プレーンテキストで出力すること (前置きや見出しは不要)
`;
}
