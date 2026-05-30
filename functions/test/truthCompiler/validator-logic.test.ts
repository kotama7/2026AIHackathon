import { describe, expect, it } from '@jest/globals';

import { validateLogic } from '../../src/truthCompiler/validator/logic.js';
import { makeValidCaseTruth } from '../fixtures/caseTruth.js';

/**
 * A2-08: validateLogic の純ロジック検証。
 * 正常系フィクスチャが通過し、6 つの論理チェックそれぞれで個別に失敗することを確認する。
 */
describe('validateLogic', () => {
  it('正常系フィクスチャは passed === true', () => {
    const result = validateLogic(makeValidCaseTruth());
    if (!result.passed) {
      // 失敗時に原因を可視化

      console.error(JSON.stringify(result.issues, null, 2));
    }
    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(typeof result.durationMs).toBe('number');
  });

  it('1. 同一人物が同時刻に複数地点に存在すると失敗', () => {
    const truth = makeValidCaseTruth();
    // char_3 は time_1 (lobby, 23:50) を持つ。同時刻に別の場所のイベントを追加。
    truth.timeline.push({
      id: 'time_dup',
      time: '23:50',
      character: 'char_3',
      location: 'basement',
      action: '同時刻に地下室にも存在する (矛盾)',
      knownBy: ['char_3'],
      observedBy: [],
      causesEvidence: [],
    });

    const result = validateLogic(truth);
    expect(result.passed).toBe(false);
    expect(
      result.issues.some(
        (i) =>
          i.category === 'logic' &&
          i.severity === 'error' &&
          (i.relatedIds ?? []).includes('time_1') &&
          (i.relatedIds ?? []).includes('time_dup')
      )
    ).toBe(true);
  });

  it('2. 人狼が現場へ到達不可能 (非隣接ジャンプ) だと失敗', () => {
    const truth = makeValidCaseTruth();
    // char_3 の time_1 を lobby から private_room に変更すると
    // private_room → clock_tower (time_2) は隣接しないため到達不可能。
    const time1 = truth.timeline.find((e) => e.id === 'time_1')!;
    time1.location = 'private_room';

    const result = validateLogic(truth);
    expect(result.passed).toBe(false);
    expect(
      result.issues.some(
        (i) =>
          i.category === 'logic' &&
          i.severity === 'error' &&
          (i.relatedIds ?? []).includes('char_3')
      )
    ).toBe(true);
  });

  it('3. 被害者が現場にいないと失敗', () => {
    const truth = makeValidCaseTruth();
    // 被害者 victim_1 の time_4 を clock_tower から library に移動。
    const time4 = truth.timeline.find((e) => e.id === 'time_4')!;
    time4.location = 'library';

    const result = validateLogic(truth);
    expect(result.passed).toBe(false);
    expect(
      result.issues.some(
        (i) =>
          i.category === 'logic' &&
          i.severity === 'error' &&
          (i.relatedIds ?? []).includes('victim_1')
      )
    ).toBe(true);
  });

  it('4. 証拠の sourceTimelineEvent が実在しないと失敗', () => {
    const truth = makeValidCaseTruth();
    const ev = truth.evidence.find((e) => e.id === 'ev_c1')!;
    // スキーマ検証は通さず、検証ロジック単体の挙動を確認する。
    ev.sourceTimelineEvent = 'time_does_not_exist';

    const result = validateLogic(truth);
    expect(result.passed).toBe(false);
    expect(
      result.issues.some(
        (i) =>
          i.category === 'logic' &&
          i.severity === 'error' &&
          (i.relatedIds ?? []).includes('ev_c1') &&
          (i.relatedIds ?? []).includes('time_does_not_exist')
      )
    ).toBe(true);
  });

  it('5. 目撃者が居合わせていないと失敗 (visibility)', () => {
    const truth = makeValidCaseTruth();
    // time_7 (char_2, library) を char_4 が目撃したことにする。
    // char_4 は private_room にしかおらず居合わせていないため失敗。
    const time7 = truth.timeline.find((e) => e.id === 'time_7')!;
    time7.observedBy = ['char_4'];

    const result = validateLogic(truth);
    expect(result.passed).toBe(false);
    expect(
      result.issues.some(
        (i) =>
          i.category === 'logic' &&
          i.severity === 'error' &&
          (i.relatedIds ?? []).includes('time_7') &&
          (i.relatedIds ?? []).includes('char_4')
      )
    ).toBe(true);
  });

  it('6. 証言の knownFactsUsed が知識範囲外だと失敗', () => {
    const truth = makeValidCaseTruth();
    // t3 (char_2) の knownFactsUsed を char_2 の知識範囲外 (time_3) に変更。
    const t3 = truth.testimonies.find((t) => t.id === 't3')!;
    t3.knownFactsUsed = ['time_3'];

    const result = validateLogic(truth);
    expect(result.passed).toBe(false);
    expect(
      result.issues.some(
        (i) =>
          i.category === 'logic' &&
          i.severity === 'error' &&
          (i.relatedIds ?? []).includes('t3') &&
          (i.relatedIds ?? []).includes('time_3')
      )
    ).toBe(true);
  });
});
