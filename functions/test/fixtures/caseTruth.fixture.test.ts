import { describe, expect, it } from '@jest/globals';
import { schemas } from '@village/shared';

import { makeValidCaseTruth } from './caseTruth.js';

describe('makeValidCaseTruth fixture', () => {
  it('caseTruthSchema を通過する', () => {
    const result = schemas.caseTruthSchema.safeParse(makeValidCaseTruth());
    if (!result.success) {
      // 失敗時に原因を可視化

      console.error(JSON.stringify(result.error.issues, null, 2));
    }
    expect(result.success).toBe(true);
  });

  it('deep clone なので呼び出しごとに独立している', () => {
    const a = makeValidCaseTruth();
    a.characters[0]!.name = 'CHANGED';
    const b = makeValidCaseTruth();
    expect(b.characters[0]!.name).not.toBe('CHANGED');
  });
});
