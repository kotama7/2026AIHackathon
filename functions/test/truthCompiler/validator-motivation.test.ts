import { describe, expect, it, jest } from '@jest/globals';

import { makeValidCaseTruth } from '../fixtures/caseTruth.js';

/**
 * A2-09 思惑整合性検証のテスト。
 * LLM (generateStructured) を mock し、純ロジック 3 項目と LLM judge の挙動を確認する。
 */
jest.unstable_mockModule('../../src/llm/validateAndRetry.js', () => ({
  generateStructured: jest.fn(),
}));

const { generateStructured } = await import('../../src/llm/validateAndRetry.js');
const { validateMotivation, validateMotivationPure } =
  await import('../../src/truthCompiler/validator/motivation.js');
const mockedGenerateStructured = generateStructured as jest.MockedFunction<
  typeof generateStructured
>;

describe('validateMotivationPure', () => {
  it('良いケースは passed', () => {
    const result = validateMotivationPure(makeValidCaseTruth());
    expect(result.passed).toBe(true);
    expect(result.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('privateGoal を空にすると error で fail', () => {
    const truth = makeValidCaseTruth();
    truth.characters[0]!.privateGoal = '';
    const result = validateMotivationPure(truth);
    expect(result.passed).toBe(false);
    const issue = result.issues.find(
      (i) => i.severity === 'error' && i.relatedIds?.includes(truth.characters[0]!.id)
    );
    expect(issue).toBeDefined();
    expect(issue?.category).toBe('motivation');
  });

  it('人狼の襲撃イベントを村人が目撃していると error で fail', () => {
    const truth = makeValidCaseTruth();
    // 人狼 char_3 の襲撃場所 (clock_tower) のイベントに村人 char_1 を observedBy で追加
    const werewolfId = truth.summary.werewolfId;
    const attackEvent = truth.timeline.find(
      (e) => e.character === werewolfId && e.location === truth.summary.attackLocation
    )!;
    const villagerId = 'char_1';
    attackEvent.observedBy.push(villagerId);
    const result = validateMotivationPure(truth);
    expect(result.passed).toBe(false);
    const issue = result.issues.find(
      (i) =>
        i.severity === 'error' &&
        i.relatedIds?.includes(villagerId) &&
        i.relatedIds?.includes(attackEvent.id)
    );
    expect(issue).toBeDefined();
  });
});

describe('validateMotivation', () => {
  beforeEach(() => {
    mockedGenerateStructured.mockReset();
  });

  it('useLlm:false なら LLM を呼ばず良いケースは passed', async () => {
    const result = await validateMotivation(makeValidCaseTruth(), { useLlm: false });
    expect(result.passed).toBe(true);
    expect(mockedGenerateStructured).not.toHaveBeenCalled();
  });

  it('useLlm:true で consistent:false の verdict は warning として積まれ、passed は維持される', async () => {
    mockedGenerateStructured.mockResolvedValueOnce({
      data: {
        verdicts: [{ characterId: 'char_1', consistent: false, reason: '行動が目的と矛盾' }],
      },
      raw: '{}',
      geminiAttempts: 1,
      schemaAttempts: 1,
      durationMs: 10,
    });

    const result = await validateMotivation(makeValidCaseTruth(), { useLlm: true });
    expect(mockedGenerateStructured).toHaveBeenCalledTimes(1);
    const warning = result.issues.find(
      (i) => i.severity === 'warning' && i.relatedIds?.includes('char_1')
    );
    expect(warning).toBeDefined();
    expect(warning?.category).toBe('motivation');
    // error は無いので passed は true のまま
    expect(result.passed).toBe(true);
  });
});
