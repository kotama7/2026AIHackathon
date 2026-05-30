import { describe, expect, it } from '@jest/globals';
import { schemas } from '@village/shared';

import { loadSeedCase, SEED_CASE_IDS } from '../src/seed/loadSeedCase.js';
import { validateAll } from '../src/truthCompiler/validator/validateAll.js';

/**
 * P5-07: シード CaseTruth が「検証済み」であり続けることを保証する回帰テスト。
 * seedCases/*.json を編集して壊したら必ずここで落ちる。
 */
describe('seed cases (P5-07)', () => {
  it('2 件以上のシードが存在する', () => {
    expect(SEED_CASE_IDS.length).toBeGreaterThanOrEqual(2);
  });

  describe.each(SEED_CASE_IDS)('seed: %s', (id) => {
    it('caseTruthSchema を通過する', () => {
      const truth = loadSeedCase('game_test', id);
      expect(schemas.caseTruthSchema.safeParse(truth).success).toBe(true);
    });

    it('純ロジック validator (deducibility / logic / motivation) を通過する', async () => {
      const truth = loadSeedCase('game_test', id);
      const result = await validateAll(truth, { useLlm: false });
      if (!result.passed) {
        console.error(id, JSON.stringify(result.issues, null, 2));
      }
      expect(result.passed).toBe(true);
    });

    it('人狼はちょうど 1 人 / 容疑者 6 人', () => {
      const truth = loadSeedCase('game_test', id);
      expect(truth.characters).toHaveLength(6);
      expect(truth.characters.filter((c) => c.isWerewolf)).toHaveLength(1);
    });
  });

  it('loadSeedCase は caseId を gameId に差し替える', () => {
    const truth = loadSeedCase('my_game_123', 'clocktower');
    expect(truth.caseId).toBe('my_game_123');
  });

  it('seedId 未指定でも gameId から決定的に 1 件選ぶ', () => {
    const a = loadSeedCase('same_game');
    const b = loadSeedCase('same_game');
    expect(a.summary.werewolfId).toBe(b.summary.werewolfId);
  });

  it('元データは変更されない (clone を返す)', () => {
    const a = loadSeedCase('g1', 'clocktower');
    a.characters[0]!.name = 'MUTATED';
    const b = loadSeedCase('g2', 'clocktower');
    expect(b.characters[0]!.name).not.toBe('MUTATED');
  });
});
