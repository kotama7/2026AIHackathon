import { describe, expect, it } from '@jest/globals';

import { applyJsonPatch } from '../../src/truthCompiler/jsonPatch.js';

describe('applyJsonPatch', () => {
  it('replace でネストした値を更新する', () => {
    const doc = { a: { b: [1, 2, 3] } };
    const r = applyJsonPatch(doc, [{ op: 'replace', path: '/a/b/1', value: 99 }]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.doc).toEqual({ a: { b: [1, 99, 3] } });
  });

  it('元の doc を破壊しない', () => {
    const doc = { a: { b: [1, 2, 3] } };
    applyJsonPatch(doc, [{ op: 'replace', path: '/a/b/0', value: 0 }]);
    expect(doc.a.b[0]).toBe(1);
  });

  it('add でオブジェクトキーと配列要素を追加する', () => {
    const r1 = applyJsonPatch({ x: {} }, [{ op: 'add', path: '/x/y', value: 5 }]);
    expect(r1.ok && r1.doc).toEqual({ x: { y: 5 } });
    const r2 = applyJsonPatch({ arr: [1, 2] }, [{ op: 'add', path: '/arr/-', value: 3 }]);
    expect(r2.ok && r2.doc).toEqual({ arr: [1, 2, 3] });
    const r3 = applyJsonPatch({ arr: [1, 3] }, [{ op: 'add', path: '/arr/1', value: 2 }]);
    expect(r3.ok && r3.doc).toEqual({ arr: [1, 2, 3] });
  });

  it('remove でキー / 配列要素を削除する', () => {
    const r1 = applyJsonPatch({ a: 1, b: 2 }, [{ op: 'remove', path: '/b' }]);
    expect(r1.ok && r1.doc).toEqual({ a: 1 });
    const r2 = applyJsonPatch({ arr: [1, 2, 3] }, [{ op: 'remove', path: '/arr/0' }]);
    expect(r2.ok && r2.doc).toEqual({ arr: [2, 3] });
  });

  it('範囲外 index や存在しないキーは ok:false', () => {
    const r1 = applyJsonPatch({ arr: [1] }, [{ op: 'replace', path: '/arr/5', value: 0 }]);
    expect(r1.ok).toBe(false);
    const r2 = applyJsonPatch({ a: 1 }, [{ op: 'remove', path: '/nope' }]);
    expect(r2.ok).toBe(false);
  });

  it('複数 patch: 一部失敗しても成功 op は適用し ok:true (寛容適用)', () => {
    const r = applyJsonPatch({ a: 1, b: 2 }, [
      { op: 'replace', path: '/a', value: 10 },
      { op: 'replace', path: '/missing/x', value: 1 }, // これは失敗するがスキップ
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.doc).toEqual({ a: 10, b: 2 });
  });

  it('全 op 失敗のときのみ ok:false', () => {
    const r = applyJsonPatch({ a: 1 }, [
      { op: 'remove', path: '/nope' },
      { op: 'replace', path: '/missing/x', value: 1 },
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.failedOp.path).toBe('/missing/x');
  });

  it('~1 / ~0 エスケープを解決する', () => {
    const r = applyJsonPatch({ 'a/b': 1 }, [{ op: 'replace', path: '/a~1b', value: 2 }]);
    expect(r.ok && r.doc).toEqual({ 'a/b': 2 });
  });
});
