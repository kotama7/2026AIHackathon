import { describe, expect, it } from '@jest/globals';
import type { CaseTruth, CharacterPublic, GameMeta } from '@village/shared';

import { evaluateGameStatus, type EvaluateInput } from '../src/gameLoop/winLose.js';

const baseMeta: Pick<GameMeta, 'currentDay' | 'villageTrust' | 'aliveCharacters'> = {
  currentDay: 1,
  villageTrust: 50,
  aliveCharacters: ['w', 'v1', 'v2', 'v3', 'v4', 'v5'],
};

const baseCharacters: Pick<CharacterPublic, 'id' | 'isAlive'>[] = [
  { id: 'w', isAlive: true },
  { id: 'v1', isAlive: true },
  { id: 'v2', isAlive: true },
  { id: 'v3', isAlive: true },
  { id: 'v4', isAlive: true },
  { id: 'v5', isAlive: true },
];

const baseCaseTruth: Pick<CaseTruth, 'summary'> = {
  summary: {
    werewolfId: 'w',
    victimId: 'victim',
    attackTime: '23:00',
    attackLocation: 'square',
    solutionLogic: 'dummy',
  },
};

function input(overrides: Partial<EvaluateInput> = {}): EvaluateInput {
  return {
    trigger: 'night_end',
    meta: baseMeta,
    characters: baseCharacters,
    caseTruth: baseCaseTruth,
    ...overrides,
  };
}

describe('evaluateGameStatus', () => {
  it('裁判で人狼を処刑 → won', () => {
    const res = evaluateGameStatus(input({ trigger: 'trial_execute', executedCharacterId: 'w' }));
    expect(res.status).toBe('won');
  });

  it('裁判で村人を誤処刑 → won にならず他条件評価', () => {
    const res = evaluateGameStatus(input({ trigger: 'trial_execute', executedCharacterId: 'v1' }));
    expect(res.status).toBe('in_progress');
  });

  it('villageTrust が閾値 (20) を下回ったら lost_trust_collapsed', () => {
    const res = evaluateGameStatus(input({ meta: { ...baseMeta, villageTrust: 19 } }));
    expect(res.status).toBe('lost_trust_collapsed');
  });

  it('生存村人 ≤ MIN_ALIVE_VILLAGERS なら lost_too_few_villagers', () => {
    // 村人 5 → 2 にする (人狼 w 含む生存 3)
    const chars: Pick<CharacterPublic, 'id' | 'isAlive'>[] = baseCharacters.map((c) =>
      ['v3', 'v4', 'v5'].includes(c.id) ? { ...c, isAlive: false } : c
    );
    const res = evaluateGameStatus(input({ characters: chars }));
    expect(res.status).toBe('lost_too_few_villagers');
  });

  it('Day 3 night_end で狼生存 → lost_werewolf_survived', () => {
    const res = evaluateGameStatus(input({ meta: { ...baseMeta, currentDay: 3 } }));
    expect(res.status).toBe('lost_werewolf_survived');
  });

  it('Day 3 night_end でも狼が既に死亡なら in_progress (=won は裁判判定で先取りされる前提)', () => {
    const chars: Pick<CharacterPublic, 'id' | 'isAlive'>[] = baseCharacters.map((c) =>
      c.id === 'w' ? { ...c, isAlive: false } : c
    );
    const res = evaluateGameStatus(
      input({ meta: { ...baseMeta, currentDay: 3 }, characters: chars })
    );
    expect(res.status).toBe('in_progress');
  });

  it('それ以外は in_progress', () => {
    expect(evaluateGameStatus(input()).status).toBe('in_progress');
  });
});
