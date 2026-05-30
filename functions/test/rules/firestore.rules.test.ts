import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// jest の cwd は functions/ なので相対で firestore.rules を引く
const RULES_PATH = resolve(process.cwd(), '../firestore.rules');

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from '@jest/globals';
import { doc, getDoc, setDoc } from 'firebase/firestore';

/**
 * A1-07: Firestore セキュリティルール のホワイトボックステスト。
 *
 * 前提: Firestore emulator が起動中 (port 8080)
 *   - 手動: `pnpm --filter @village/functions emulators` 別タームで
 *   - CI:   `pnpm --filter @village/functions test:rules:ci` で emulators:exec 経由
 */

let testEnv: RulesTestEnvironment;

const PROJECT_ID = 'aihackathon-rules-test';
const ALICE_UID = 'alice';
const BOB_UID = 'bob';
const GAME_ID = 'game_alpha';

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

// =============================================================================
// users/{uid}/games/{gameId}
// =============================================================================

describe('users/{uid}/games/{gameId}/meta — owner read のみ', () => {
  it('owner は自分の meta を read できる', async () => {
    // Admin context で seed (rules を回避)
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `users/${ALICE_UID}/games/${GAME_ID}/meta/state`), {
        currentDay: 1,
      });
    });
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertSucceeds(getDoc(doc(aliceDb, `users/${ALICE_UID}/games/${GAME_ID}/meta/state`)));
  });

  it('他人の meta は read できない', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `users/${ALICE_UID}/games/${GAME_ID}/meta/state`), {
        currentDay: 1,
      });
    });
    const bobDb = testEnv.authenticatedContext(BOB_UID).firestore();
    await assertFails(getDoc(doc(bobDb, `users/${ALICE_UID}/games/${GAME_ID}/meta/state`)));
  });

  it('未ログインは read できない', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `users/${ALICE_UID}/games/${GAME_ID}/meta/state`), {
        currentDay: 1,
      });
    });
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(unauthDb, `users/${ALICE_UID}/games/${GAME_ID}/meta/state`)));
  });

  it('owner でもクライアントから meta write はできない (Functions 経由のみ)', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertFails(
      setDoc(doc(aliceDb, `users/${ALICE_UID}/games/${GAME_ID}/meta/state`), {
        currentDay: 1,
      })
    );
  });
});

// =============================================================================
// pins / contradictions — owner write 許可の例外
// =============================================================================

describe('users/{uid}/games/{gameId}/pins — owner write 許可', () => {
  it('owner は valid な pin を create できる', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertSucceeds(
      setDoc(doc(aliceDb, `users/${ALICE_UID}/games/${GAME_ID}/pins/pin1`), {
        refType: 'log',
        refId: 'log_001',
        day: 1,
      })
    );
  });

  it('他人の pin は create できない', async () => {
    const bobDb = testEnv.authenticatedContext(BOB_UID).firestore();
    await assertFails(
      setDoc(doc(bobDb, `users/${ALICE_UID}/games/${GAME_ID}/pins/pin1`), {
        refType: 'log',
        refId: 'log_001',
        day: 1,
      })
    );
  });

  it('refType が不正だと拒否', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertFails(
      setDoc(doc(aliceDb, `users/${ALICE_UID}/games/${GAME_ID}/pins/pin1`), {
        refType: 'invalid',
        refId: 'log_001',
        day: 1,
      })
    );
  });

  it('day が範囲外だと拒否', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertFails(
      setDoc(doc(aliceDb, `users/${ALICE_UID}/games/${GAME_ID}/pins/pin1`), {
        refType: 'log',
        refId: 'log_001',
        day: 99,
      })
    );
  });
});

describe('users/{uid}/games/{gameId}/contradictions — owner write 許可', () => {
  it('owner は valid な contradiction を create できる', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertSucceeds(
      setDoc(doc(aliceDb, `users/${ALICE_UID}/games/${GAME_ID}/contradictions/c1`), {
        pinIds: ['pin1', 'pin2'],
        note: 'A の発言と B の証言が食い違う',
      })
    );
  });

  it('pinIds が 2 未満だと拒否', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertFails(
      setDoc(doc(aliceDb, `users/${ALICE_UID}/games/${GAME_ID}/contradictions/c1`), {
        pinIds: ['pin1'],
        note: '',
      })
    );
  });

  it('note が 500 文字超だと拒否', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertFails(
      setDoc(doc(aliceDb, `users/${ALICE_UID}/games/${GAME_ID}/contradictions/c1`), {
        pinIds: ['pin1', 'pin2'],
        note: 'a'.repeat(501),
      })
    );
  });
});

// =============================================================================
// internal/** — 完全に隔離
// =============================================================================

describe('internal/** — 完全拒否', () => {
  it('未ログインで internal/caseTruth read 不可', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(unauthDb, `internal/${GAME_ID}/caseTruth/full`)));
  });

  it('認証済みでも internal/caseTruth read 不可', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertFails(getDoc(doc(aliceDb, `internal/${GAME_ID}/caseTruth/full`)));
  });

  it('認証済みでも internal/characterSecrets write 不可', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertFails(
      setDoc(doc(aliceDb, `internal/${GAME_ID}/characterSecrets/char_001`), { name: 'X' })
    );
  });

  it('認証済みでも internal/timeline 内任意のドキュメント read 不可', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertFails(getDoc(doc(aliceDb, `internal/${GAME_ID}/timeline/evt001`)));
  });
});

// =============================================================================
// それ以外のパス
// =============================================================================

describe('未許可パス — 全拒否', () => {
  it('top-level の任意コレクションは read 不可', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertFails(getDoc(doc(aliceDb, 'misc/something')));
  });

  it('top-level の任意コレクションは write 不可', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertFails(setDoc(doc(aliceDb, 'misc/something'), { foo: 'bar' }));
  });
});
