import { describe, expect, it, jest } from '@jest/globals';
import type { CaseSkeleton, ValidationResult } from '@village/shared';

import { makeValidCaseTruth } from '../fixtures/caseTruth.js';

/**
 * A2-11: compileCaseTruth のループ制御を検証。
 * generator 群 / validateAll / repair を mock し、合格・修正・再生成→失敗を再現する。
 */
jest.unstable_mockModule('../../src/truthCompiler/generator/caseSkeleton.js', () => ({
  generateCaseSkeleton: jest.fn(),
}));
jest.unstable_mockModule('../../src/truthCompiler/generator/characters.js', () => ({
  generateCharacters: jest.fn(),
}));
jest.unstable_mockModule('../../src/truthCompiler/generator/timeline.js', () => ({
  generateTimeline: jest.fn(),
}));
jest.unstable_mockModule('../../src/truthCompiler/generator/evidence.js', () => ({
  generateEvidence: jest.fn(),
}));
jest.unstable_mockModule('../../src/truthCompiler/generator/testimonies.js', () => ({
  generateTestimonies: jest.fn(),
}));
jest.unstable_mockModule('../../src/truthCompiler/generator/deductionPath.js', () => ({
  generateDeductionPath: jest.fn(),
}));
jest.unstable_mockModule('../../src/truthCompiler/validator/validateAll.js', () => ({
  validateAll: jest.fn(),
}));
jest.unstable_mockModule('../../src/truthCompiler/repairer.js', () => ({
  repair: jest.fn(),
}));

const { generateCaseSkeleton } = await import('../../src/truthCompiler/generator/caseSkeleton.js');
const { generateCharacters } = await import('../../src/truthCompiler/generator/characters.js');
const { generateTimeline } = await import('../../src/truthCompiler/generator/timeline.js');
const { generateEvidence } = await import('../../src/truthCompiler/generator/evidence.js');
const { generateTestimonies } = await import('../../src/truthCompiler/generator/testimonies.js');
const { generateDeductionPath } =
  await import('../../src/truthCompiler/generator/deductionPath.js');
const { validateAll } = await import('../../src/truthCompiler/validator/validateAll.js');
const { repair } = await import('../../src/truthCompiler/repairer.js');
const { compileCaseTruth, TruthCompilerError } = await import('../../src/truthCompiler/compile.js');

const fixture = makeValidCaseTruth();

function skeletonFromFixture(): CaseSkeleton {
  return {
    werewolfId: fixture.summary.werewolfId,
    victimId: fixture.summary.victimId,
    attackTime: fixture.summary.attackTime,
    attackLocation: fixture.summary.attackLocation,
    attackRoute: 'ロビー経由で時計塔へ',
    primaryEvidenceTypes: ['door_log', 'footprint'],
    redHerringCharacterId: fixture.redHerrings[0]!.characterId,
    redHerringReason: fixture.redHerrings[0]!.reason,
    solutionLogic: fixture.summary.solutionLogic,
    locationGraph: fixture.locationGraph,
  };
}

const PASS: ValidationResult = { passed: true, issues: [], scores: {}, durationMs: 1 };
const FAIL: ValidationResult = {
  passed: false,
  issues: [{ category: 'deducibility', severity: 'error', message: 'スコア不足' }],
  durationMs: 1,
};

function wireGenerators(): void {
  (generateCaseSkeleton as jest.Mock).mockResolvedValue(skeletonFromFixture());
  (generateCharacters as jest.Mock).mockResolvedValue(makeValidCaseTruth().characters);
  (generateTimeline as jest.Mock).mockResolvedValue(makeValidCaseTruth().timeline);
  (generateEvidence as jest.Mock).mockResolvedValue(makeValidCaseTruth().evidence);
  (generateTestimonies as jest.Mock).mockResolvedValue(makeValidCaseTruth().testimonies);
  (generateDeductionPath as jest.Mock).mockResolvedValue(makeValidCaseTruth().deductionPath);
}

describe('compileCaseTruth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    wireGenerators();
  });

  it('1 サイクル目で合格すれば repair/regen なしで返す', async () => {
    (validateAll as jest.Mock).mockResolvedValue(PASS);
    const { caseTruth, metrics } = await compileCaseTruth({ caseId: 'g1' });
    expect(caseTruth.caseId).toBe('g1');
    expect(caseTruth.summary.werewolfId).toBe('char_3');
    expect(metrics.cycles).toBe(1);
    expect(metrics.repairCount).toBe(0);
    expect(metrics.regenCount).toBe(0);
    expect(repair).not.toHaveBeenCalled();
    // 検証結果が埋め込まれている
    expect(caseTruth.validationResult.passed).toBe(true);
  });

  it('1 回 repair して合格すれば repairCount=1 で返す', async () => {
    (validateAll as jest.Mock).mockResolvedValueOnce(FAIL).mockResolvedValue(PASS);
    (repair as jest.Mock).mockResolvedValue({
      repaired: makeValidCaseTruth(),
      applied: true,
      unrepairable: [],
      durationMs: 1,
    });
    const { metrics } = await compileCaseTruth({ caseId: 'g2' });
    expect(metrics.repairCount).toBe(1);
    expect(metrics.regenCount).toBe(0);
    expect(metrics.cycles).toBe(1);
  });

  it('repair 不能なら再生成し、最終的に合格すれば regenCount≥1', async () => {
    // cycle0: fail → repair applied=false → break。cycle1(regen): pass
    (validateAll as jest.Mock).mockResolvedValueOnce(FAIL).mockResolvedValue(PASS);
    (repair as jest.Mock).mockResolvedValue({
      repaired: makeValidCaseTruth(),
      applied: false,
      unrepairable: FAIL.issues,
      durationMs: 1,
    });
    const { metrics } = await compileCaseTruth({ caseId: 'g3' });
    expect(metrics.regenCount).toBe(1);
    expect(metrics.cycles).toBe(2);
  });

  it('全サイクル失敗で TruthCompilerError を throw', async () => {
    (validateAll as jest.Mock).mockResolvedValue(FAIL);
    (repair as jest.Mock).mockResolvedValue({
      repaired: makeValidCaseTruth(),
      applied: false,
      unrepairable: FAIL.issues,
      durationMs: 1,
    });
    await expect(
      compileCaseTruth({ caseId: 'g4', maxRegens: 2, maxRepairs: 3 })
    ).rejects.toBeInstanceOf(TruthCompilerError);
    // 3 サイクル (初回 + 2 regen) 実行された
    expect(generateCaseSkeleton).toHaveBeenCalledTimes(3);
  });

  it('生成が throw してもサイクルを潰して再生成し、回復できる', async () => {
    (generateCaseSkeleton as jest.Mock)
      .mockRejectedValueOnce(new Error('LLM blew up'))
      .mockResolvedValue(skeletonFromFixture());
    (validateAll as jest.Mock).mockResolvedValue(PASS);
    const { metrics } = await compileCaseTruth({ caseId: 'g5' });
    expect(metrics.regenCount).toBe(1);
    expect(metrics.cycles).toBe(2);
  });
});
