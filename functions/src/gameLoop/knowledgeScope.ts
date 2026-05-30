import type { Character, DialogueOutput } from '@village/shared';

/**
 * 知識範囲違反の検出結果。
 */
export type KnowledgeScopeViolation = {
  /** 違反した knownFacts キー (character.knownFacts に存在しなかったもの) */
  unknownFactKey?: string;
  /** 違反のカテゴリ */
  category: 'unknown_fact_key' | 'werewolf_self_reveal' | 'private_info_leak';
  message: string;
};

/**
 * A3-03: LLM 発言が「キャラが知るはずのない情報」を含むか検証する純関数。
 *
 * - knownFactsUsed の各キーが character.knownFacts に含まれているか check
 * - 村人キャラが「自分は人狼」「○○が人狼」のような確定的発言をしていないか
 *   （人狼自身は嘘ポリシー上 "自分は村人" と言えるが、村人が他キャラを断定するのは禁止）
 *
 * 違反が空配列なら合格。違反があれば呼び出し側で再生成プロンプトに添える。
 *
 * MVP では LLM judge ではなく機械的なホワイトリスト方式 (要件 §4.4 のミス嘘判定対策)。
 */
export function enforceKnowledgeScope(
  output: DialogueOutput,
  speaker: Pick<Character, 'knownFacts' | 'isWerewolf'>
): KnowledgeScopeViolation[] {
  const violations: KnowledgeScopeViolation[] = [];

  const known = new Set(speaker.knownFacts);
  for (const key of output.knownFactsUsed) {
    if (!known.has(key)) {
      violations.push({
        unknownFactKey: key,
        category: 'unknown_fact_key',
        message: `knownFacts に "${key}" を含めて発言したが、このキャラはそのキーを知らない`,
      });
    }
  }

  // 村人なのに「自分は人狼」「自分が犯人」などと言ったらアウト
  if (!speaker.isWerewolf && SELF_WEREWOLF_PATTERN.test(output.utterance)) {
    violations.push({
      category: 'werewolf_self_reveal',
      message: '村人キャラが「自分は人狼」と発言した',
    });
  }

  return violations;
}

const SELF_WEREWOLF_PATTERN = /(私|俺|僕|あたし|わたし).{0,6}(人狼|狼|犯人)/;

/**
 * 違反を再生成プロンプトに添える際の補助テキスト。
 * 呼び出し側 (generateStructured の前段で or 後段で) で利用する。
 */
export function buildScopeRetryHint(violations: KnowledgeScopeViolation[]): string {
  if (violations.length === 0) return '';
  return `\n\n# 直前の出力で次の知識範囲違反が検出されました。修正して JSON のみ再出力してください:\n${violations
    .map((v) => `  - ${v.message}`)
    .join('\n')}`;
}
