import { describe, expect, it } from '@jest/globals';
import { TRUST_DELTAS } from '@village/shared';

import {
  calculateTrustDelta,
  clampTrust,
  isCorrectContradiction,
  type TrustAction,
} from '../src/trust/index.js';

describe('calculateTrustDelta', () => {
  it('正しい矛盾指摘: 対象 +5 / 村 +3', () => {
    const action: TrustAction = { kind: 'correct_contradiction', targetCharacterId: 'c1' };
    const result = calculateTrustDelta(action);
    expect(result.characterDeltas).toEqual({ c1: TRUST_DELTAS.CORRECT_CONTRADICTION.target });
    expect(result.villageDelta).toBe(TRUST_DELTAS.CORRECT_CONTRADICTION.village);
  });

  it('誤った疑い: 対象 -10 / 村 -5', () => {
    const action: TrustAction = { kind: 'wrong_accusation', targetCharacterId: 'c2' };
    const result = calculateTrustDelta(action);
    expect(result.characterDeltas).toEqual({ c2: TRUST_DELTAS.WRONG_ACCUSATION.target });
    expect(result.villageDelta).toBe(TRUST_DELTAS.WRONG_ACCUSATION.village);
  });

  it('強制証言: 対象 -8 / 村 -3', () => {
    const action: TrustAction = { kind: 'force_testimony', targetCharacterId: 'c3' };
    const result = calculateTrustDelta(action);
    expect(result.characterDeltas).toEqual({ c3: TRUST_DELTAS.FORCE_TESTIMONY.target });
    expect(result.villageDelta).toBe(TRUST_DELTAS.FORCE_TESTIMONY.village);
  });

  it('人狼処刑成功: 全村 +20、キャラ差分なし', () => {
    const result = calculateTrustDelta({ kind: 'execute_werewolf' });
    expect(result.characterDeltas).toEqual({});
    expect(result.villageDelta).toBe(TRUST_DELTAS.EXECUTE_WEREWOLF.village);
  });

  it('村人誤処刑: 全村 -30、キャラ差分なし', () => {
    const result = calculateTrustDelta({ kind: 'execute_villager' });
    expect(result.characterDeltas).toEqual({});
    expect(result.villageDelta).toBe(TRUST_DELTAS.EXECUTE_VILLAGER.village);
  });
});

describe('clampTrust', () => {
  it.each([
    [-50, 0],
    [0, 0],
    [50, 50],
    [100, 100],
    [150, 100],
  ])('clampTrust(%s) === %s', (input, expected) => {
    expect(clampTrust(input)).toBe(expected);
  });
});

describe('isCorrectContradiction', () => {
  const testimony = { contradictedBy: ['e_alibi', 't_witness'] as const };

  it('提示した証拠が contradictedBy に含まれていれば true', () => {
    expect(
      isCorrectContradiction(['e_alibi'], { contradictedBy: [...testimony.contradictedBy] })
    ).toBe(true);
  });

  it('複数提示のうち 1 つでも該当すれば true', () => {
    expect(
      isCorrectContradiction(['e_unrelated', 't_witness'], {
        contradictedBy: [...testimony.contradictedBy],
      })
    ).toBe(true);
  });

  it('一切該当しなければ false', () => {
    expect(
      isCorrectContradiction(['e_unrelated'], { contradictedBy: [...testimony.contradictedBy] })
    ).toBe(false);
  });

  it('提示なしなら false', () => {
    expect(isCorrectContradiction([], { contradictedBy: [...testimony.contradictedBy] })).toBe(
      false
    );
  });

  it('contradictedBy が空の証言は false', () => {
    expect(isCorrectContradiction(['e_anything'], { contradictedBy: [] })).toBe(false);
  });
});
