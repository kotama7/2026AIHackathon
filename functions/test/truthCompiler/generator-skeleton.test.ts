import { describe, expect, it, jest } from '@jest/globals';
import { schemas } from '@village/shared';

import { makeValidCaseTruth } from '../fixtures/caseTruth.js';

/**
 * A2-01: generateCaseSkeleton。generateStructured を mock し、組み立てと検証を確認。
 */
jest.unstable_mockModule('../../src/llm/validateAndRetry.js', () => ({
  generateStructured: jest.fn(),
}));

const { generateStructured } = await import('../../src/llm/validateAndRetry.js');
const { generateCaseSkeleton } = await import('../../src/truthCompiler/generator/caseSkeleton.js');
const mocked = generateStructured as jest.MockedFunction<typeof generateStructured>;

function skeletonFrom(truth = makeValidCaseTruth()) {
  return {
    werewolfId: truth.summary.werewolfId,
    victimId: 'victim_1' as const,
    attackTime: truth.summary.attackTime,
    attackLocation: truth.summary.attackLocation,
    attackRoute: 'ロビーを経由して時計塔へ',
    primaryEvidenceTypes: ['door_log', 'footprint'],
    redHerringCharacterId: 'char_5',
    redHerringReason: '中庭での密会を隠すため怪しく見える',
    solutionLogic: truth.summary.solutionLogic,
    locationGraph: truth.locationGraph,
  };
}

describe('generateCaseSkeleton', () => {
  beforeEach(() => mocked.mockReset());

  it('CaseSkeleton を返し共有スキーマを通過する', async () => {
    const data = skeletonFrom();
    mocked.mockResolvedValueOnce({
      data,
      raw: JSON.stringify(data),
      geminiAttempts: 1,
      schemaAttempts: 1,
      durationMs: 120,
      inputTokens: 300,
      outputTokens: 200,
    });
    const skeleton = await generateCaseSkeleton({ caseId: 'g1' });
    expect(schemas.caseSkeletonSchema.safeParse(skeleton).success).toBe(true);
    expect(skeleton.victimId).toBe('victim_1');
    expect(skeleton.werewolfId).not.toBe(skeleton.redHerringCharacterId);
  });

  it('opts.collect にメトリクスを通知する', async () => {
    const data = skeletonFrom();
    mocked.mockResolvedValueOnce({
      data,
      raw: JSON.stringify(data),
      geminiAttempts: 2,
      schemaAttempts: 1,
      durationMs: 250,
      inputTokens: 300,
      outputTokens: 200,
    });
    const collected: unknown[] = [];
    await generateCaseSkeleton({ caseId: 'g1' }, { collect: (m) => collected.push(m) });
    expect(collected).toHaveLength(1);
    expect(collected[0]).toMatchObject({ stage: 'skeleton', durationMs: 250 });
  });
});
