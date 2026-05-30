import { describe, expect, it } from '@jest/globals';
import type { CaseTruth } from '@village/shared';

import {
  computeSuspectScores,
  validateDeducibility,
} from '../../src/truthCompiler/validator/deducibility.js';
import { makeValidCaseTruth } from '../fixtures/caseTruth.js';

/**
 * A2-07: validateDeducibility の純ロジックテスト。
 *
 * 基準フィクスチャのスコア: char_3 = 8 (人狼), char_5 = 5 (レッドヘリング),
 * char_2 = 1, gap = 3。clone を壊して各検証項目を 1 件ずつトリップさせる。
 */

/** 指定 id の証拠を取り出す (存在を保証)。 */
function ev(truth: CaseTruth, id: string) {
  const found = truth.evidence.find((e) => e.id === id);
  if (!found) throw new Error(`evidence ${id} not found in fixture`);
  return found;
}

describe('computeSuspectScores', () => {
  it('pointsTo の weight を容疑者ごとに合計する', () => {
    const scores = computeSuspectScores(makeValidCaseTruth());
    expect(scores['char_3']).toBe(8);
    expect(scores['char_5']).toBe(5);
    expect(scores['char_2']).toBe(1);
    // 被害者は集計対象外
    expect(scores['victim_1']).toBeUndefined();
  });
});

describe('validateDeducibility - good case', () => {
  it('基準フィクスチャは合格し error issue を持たない', () => {
    const result = validateDeducibility(makeValidCaseTruth());
    expect(result.passed).toBe(true);
    expect(result.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
    expect(result.scores['char_3']).toBe(8);
    expect(result.scores['char_5']).toBe(5);
    expect(typeof result.durationMs).toBe('number');
  });
});

describe('validateDeducibility - failing cases', () => {
  it('Check1: 人狼が最大スコアでない (char_5 >= char_3)', () => {
    const truth = makeValidCaseTruth();
    // char_5 の noise 証拠 (ev_n3, weight 1) を +4 して char_5 = 9 > char_3 = 8。
    ev(truth, 'ev_n3').weight = 5;
    const result = validateDeducibility(truth);
    expect(result.passed).toBe(false);
    const issue = result.issues.find(
      (i) =>
        i.category === 'deducibility' &&
        i.severity === 'error' &&
        i.message.includes('高いスコア') &&
        (i.relatedIds ?? []).includes('char_5')
    );
    expect(issue).toBeDefined();
  });

  it('Check2: 人狼スコアが範囲外 (char_3 < 7)', () => {
    const truth = makeValidCaseTruth();
    // confirmatory ev_c1 (weight 3) を 0 にして char_3 = 5 (<7)。
    ev(truth, 'ev_c1').weight = 0;
    const result = validateDeducibility(truth);
    expect(result.passed).toBe(false);
    // gap も同時に崩れる可能性があるため、人狼スコア範囲外の issue が存在することのみ確認。
    const issue = result.issues.find(
      (i) =>
        i.category === 'deducibility' &&
        i.severity === 'error' &&
        i.message.includes('スコア') &&
        i.message.includes('範囲外') &&
        (i.relatedIds ?? []).includes('char_3')
    );
    expect(issue).toBeDefined();
  });

  it('Check3: 最大レッドヘリングスコアが範囲外 (< 4)', () => {
    const truth = makeValidCaseTruth();
    // char_5 (=5) の証拠を別々の容疑者へ分散させ、どの非人狼も 4 未満にする。
    // ev_s2(2)->char_1, ev_n1(2)->char_4, ev_n3(1)->char_6 で最大非人狼 = 2 (<4)。
    ev(truth, 'ev_s2').pointsTo = ['char_1'];
    ev(truth, 'ev_n1').pointsTo = ['char_4'];
    ev(truth, 'ev_n3').pointsTo = ['char_6'];
    const result = validateDeducibility(truth);
    expect(result.passed).toBe(false);
    const issue = result.issues.find(
      (i) =>
        i.category === 'deducibility' &&
        i.severity === 'error' &&
        i.message.includes('レッドヘリングスコア') &&
        i.message.includes('範囲外')
    );
    expect(issue).toBeDefined();
  });

  it('Check4: gap が範囲外 (< 2)', () => {
    const truth = makeValidCaseTruth();
    // char_5 を +2 して 7 にすると gap = 8 - 7 = 1 (<2)。redHerring(7) も範囲外になるが
    // gap の issue が存在することを確認する。
    ev(truth, 'ev_n3').weight = 3;
    const result = validateDeducibility(truth);
    expect(result.passed).toBe(false);
    const issue = result.issues.find(
      (i) =>
        i.category === 'deducibility' &&
        i.severity === 'error' &&
        i.message.includes('差') &&
        i.message.includes('範囲外')
    );
    expect(issue).toBeDefined();
  });

  it('Check5: 人狼を示す証拠が 2 件未満', () => {
    const truth = makeValidCaseTruth();
    // char_3 を示す confirmatory/supporting を別人へ付け替え、char_3 の証拠を 0 件に。
    for (const id of ['ev_c1', 'ev_c2', 'ev_s1']) {
      ev(truth, id).pointsTo = ['char_1'];
    }
    const result = validateDeducibility(truth);
    expect(result.passed).toBe(false);
    const issue = result.issues.find(
      (i) =>
        i.category === 'deducibility' &&
        i.severity === 'error' &&
        i.message.includes('示す証拠') &&
        (i.relatedIds ?? []).includes('char_3')
    );
    expect(issue).toBeDefined();
  });

  it('Check6: deduction_path が最後まで接続していない', () => {
    const truth = makeValidCaseTruth();
    // step1 から char_2 を除外リストから外すと、和集合 + finalTarget が全員に届かない。
    const step1 = truth.deductionPath.steps[0]!;
    step1.excludedSuspects = step1.excludedSuspects.filter((id) => id !== 'char_2');
    const result = validateDeducibility(truth);
    expect(result.passed).toBe(false);
    const issue = result.issues.find(
      (i) =>
        i.category === 'deducibility' &&
        i.severity === 'error' &&
        i.message.includes('網羅') &&
        (i.relatedIds ?? []).includes('char_2')
    );
    expect(issue).toBeDefined();
  });
});
