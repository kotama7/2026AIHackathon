import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { schemas } from '@village/shared';

import type { CaseDraft } from '../../src/truthCompiler/types.js';
import { makeValidCaseTruth } from '../fixtures/caseTruth.js';

/**
 * A2-06: generateDeductionPath。generateStructured を mock し、組み立てと検証を確認。
 */
jest.unstable_mockModule('../../src/llm/validateAndRetry.js', () => ({
  generateStructured: jest.fn(),
}));

const { generateStructured } = await import('../../src/llm/validateAndRetry.js');
const { generateDeductionPath } =
  await import('../../src/truthCompiler/generator/deductionPath.js');
const mocked = generateStructured as jest.MockedFunction<typeof generateStructured>;

/** fixture の CaseTruth から deductionPath / validationResult を除いた CaseDraft を作る。 */
function draftFrom(truth = makeValidCaseTruth()): CaseDraft {
  return {
    caseId: truth.caseId,
    summary: truth.summary,
    characters: truth.characters,
    timeline: truth.timeline,
    evidence: truth.evidence,
    testimonies: truth.testimonies,
    plannedLies: truth.plannedLies,
    redHerrings: truth.redHerrings,
    locationGraph: truth.locationGraph,
  };
}

describe('generateDeductionPath', () => {
  beforeEach(() => mocked.mockReset());

  it('DeductionPath を返し共有スキーマを通過する', async () => {
    const truth = makeValidCaseTruth();
    const data = truth.deductionPath;
    mocked.mockResolvedValueOnce({
      data,
      raw: JSON.stringify(data),
      geminiAttempts: 1,
      schemaAttempts: 1,
      durationMs: 130,
      inputTokens: 400,
      outputTokens: 250,
    });

    const path = await generateDeductionPath(draftFrom(truth));

    expect(schemas.deductionPathSchema.safeParse(path).success).toBe(true);
    expect(path.finalTarget).toBe(truth.summary.werewolfId);

    // union(excludedSuspects) ∪ {finalTarget} === 全 6 容疑者
    const union = new Set<string>();
    for (const step of path.steps) {
      for (const s of step.excludedSuspects) union.add(s);
    }
    union.add(path.finalTarget);
    expect([...union].sort()).toEqual(['char_1', 'char_2', 'char_3', 'char_4', 'char_5', 'char_6']);
  });

  it('opts.collect に deductionPath メトリクスを通知する', async () => {
    const data = makeValidCaseTruth().deductionPath;
    mocked.mockResolvedValueOnce({
      data,
      raw: JSON.stringify(data),
      geminiAttempts: 2,
      schemaAttempts: 1,
      durationMs: 270,
      inputTokens: 400,
      outputTokens: 250,
    });

    const collected: unknown[] = [];
    await generateDeductionPath(draftFrom(), { collect: (m) => collected.push(m) });

    expect(collected).toHaveLength(1);
    expect(collected[0]).toMatchObject({ stage: 'deductionPath', durationMs: 270 });
  });
});
