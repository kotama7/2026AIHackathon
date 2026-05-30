import { describe, expect, it } from '@jest/globals';
import functionsTestInit from 'firebase-functions-test';

import { ping } from '../src/index.js';

/**
 * firebase-functions-test の online モードは GCP プロジェクトが必要なので、
 * offline モード (引数なし) で wrap を使う。
 * Note: v2 callable は `wrap(fn)({data, auth})` で叩く。
 */
const testEnv = functionsTestInit();

describe('ping callable', () => {
  it('{ ok: true, ts: number } を返す', async () => {
    const wrapped = testEnv.wrap(ping);
    const result = (await wrapped({})) as { ok: boolean; ts: number };
    expect(result.ok).toBe(true);
    expect(typeof result.ts).toBe('number');
    expect(result.ts).toBeGreaterThan(0);
  });
});
