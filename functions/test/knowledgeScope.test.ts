import { describe, expect, it } from '@jest/globals';
import type { Character, DialogueOutput } from '@village/shared';

import { enforceKnowledgeScope } from '../src/gameLoop/knowledgeScope.js';

function makeSpeaker(
  overrides: Partial<Character> = {}
): Pick<Character, 'knownFacts' | 'isWerewolf'> {
  return {
    knownFacts: ['victim_seen_at_square', 'alibi_with_baker'],
    isWerewolf: false,
    ...overrides,
  };
}

function makeOutput(overrides: Partial<DialogueOutput> = {}): DialogueOutput {
  return {
    utterance: '昨晩は広場で被害者を見ました。',
    intent: 'observation',
    truthStatus: 'truth',
    confidence: 0.7,
    emotion: 'tense',
    knownFactsUsed: ['victim_seen_at_square'],
    ...overrides,
  };
}

describe('enforceKnowledgeScope', () => {
  it('knownFactsUsed が全部 knownFacts に含まれていれば違反なし', () => {
    expect(enforceKnowledgeScope(makeOutput(), makeSpeaker())).toEqual([]);
  });

  it('knownFacts に無いキーを使うと違反', () => {
    const v = enforceKnowledgeScope(
      makeOutput({ knownFactsUsed: ['victim_seen_at_square', 'werewolf_identity'] }),
      makeSpeaker()
    );
    expect(v.length).toBe(1);
    expect(v[0]?.category).toBe('unknown_fact_key');
    expect(v[0]?.unknownFactKey).toBe('werewolf_identity');
  });

  it('村人が「私は人狼」と発言したら違反', () => {
    const v = enforceKnowledgeScope(
      makeOutput({ utterance: '実は私が人狼だ。' }),
      makeSpeaker({ isWerewolf: false })
    );
    expect(v.some((x) => x.category === 'werewolf_self_reveal')).toBe(true);
  });

  it('人狼自身が嘘で「自分は人狼」と発言した場合は許容 (lie として処理)', () => {
    const v = enforceKnowledgeScope(
      makeOutput({ utterance: '私が人狼です、もう隠さない。' }),
      makeSpeaker({ isWerewolf: true })
    );
    expect(v.find((x) => x.category === 'werewolf_self_reveal')).toBeUndefined();
  });
});
