import { describe, expect, it, jest } from '@jest/globals';
import type { ValidationIssue } from '@village/shared';

import { makeValidCaseTruth } from '../fixtures/caseTruth.js';

/**
 * A2-10: repair。generateStructured を mock し、patch 適用 / ロック拒否 / 修正不能を確認。
 */
jest.unstable_mockModule('../../src/llm/validateAndRetry.js', () => ({
  generateStructured: jest.fn(),
}));

const { generateStructured } = await import('../../src/llm/validateAndRetry.js');
const { repair } = await import('../../src/truthCompiler/repairer.js');
const mocked = generateStructured as jest.MockedFunction<typeof generateStructured>;

function mockPatches(patches: unknown[]): void {
  mocked.mockResolvedValueOnce({
    data: { patches },
    raw: JSON.stringify({ patches }),
    geminiAttempts: 1,
    schemaAttempts: 1,
    durationMs: 80,
    inputTokens: 500,
    outputTokens: 50,
  });
}

const errorIssue: ValidationIssue = {
  category: 'deducibility',
  severity: 'error',
  message: '真犯人スコアが範囲外',
};

describe('repair', () => {
  beforeEach(() => mocked.mockReset());

  it('error issue が無ければ LLM を呼ばず applied=true', async () => {
    const truth = makeValidCaseTruth();
    const r = await repair(truth, []);
    expect(r.applied).toBe(true);
    expect(mocked).not.toHaveBeenCalled();
  });

  it('有効な patch を当てて再検証に通れば applied=true', async () => {
    const truth = makeValidCaseTruth();
    // char_3 の確定証拠 weight を 3→2 に下げる無害な変更 (スキーマは通る)
    mockPatches([{ op: 'replace', path: '/evidence/0/weight', value: 2 }]);
    const r = await repair(truth, [errorIssue]);
    expect(r.applied).toBe(true);
    expect(r.repaired.evidence[0]!.weight).toBe(2);
    expect(r.unrepairable).toHaveLength(0);
  });

  it('空 patch は修正不能 (applied=false)', async () => {
    const truth = makeValidCaseTruth();
    mockPatches([]);
    const r = await repair(truth, [errorIssue]);
    expect(r.applied).toBe(false);
    expect(r.unrepairable).toEqual([errorIssue]);
    expect(r.repaired).toBe(truth);
  });

  it('人狼を書き換える patch はロックで拒否 (applied=false)', async () => {
    const truth = makeValidCaseTruth();
    mockPatches([{ op: 'replace', path: '/summary/werewolfId', value: 'char_1' }]);
    const r = await repair(truth, [errorIssue]);
    expect(r.applied).toBe(false);
  });

  it('スキーマを壊す patch は再検証で拒否 (applied=false)', async () => {
    const truth = makeValidCaseTruth();
    // characters を 5 人に削る → length(6) 違反
    mockPatches([{ op: 'remove', path: '/characters/5' }]);
    const r = await repair(truth, [errorIssue]);
    expect(r.applied).toBe(false);
  });

  it('patch 適用が失敗 (範囲外 path) なら applied=false', async () => {
    const truth = makeValidCaseTruth();
    mockPatches([{ op: 'replace', path: '/evidence/999/weight', value: 1 }]);
    const r = await repair(truth, [errorIssue]);
    expect(r.applied).toBe(false);
  });
});
