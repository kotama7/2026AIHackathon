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
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';

/**
 * A1-07 / P5-05: Firestore セキュリティルール のホワイトボックステスト。
 *
 * 前提: Firestore emulator が起動中 (port 8080)
 *   - 手動: `pnpm --filter @village/functions emulators` 別タームで
 *   - CI:   `pnpm --filter @village/functions test:rules:ci` で emulators:exec 経由
 *
 * P5-05 で全機能実装後の最終点検として、以下を網羅:
 *   1. internal/** — 匿名 + 任意 uid で read/write 全拒否 (複数 path)
 *   2. users/{uid}/games/{gameId}/** — owner read のみ / cross-uid 隔離 / client write 不可
 *   3. pins — owner valid write / invalid 拒否 / cross-uid 拒否 / delete
 *   4. contradictions — 同上
 *   5. 未許可 top-level path — catch-all で全拒否
 */

let testEnv: RulesTestEnvironment;

const PROJECT_ID = 'aihackathon-rules-test';
const ALICE_UID = 'alice';
const BOB_UID = 'bob';
const GAME_ID = 'game_alpha';

// テスト中で繰り返し使う path 組み立てヘルパー
const userGamePath = (uid: string, sub: string) => `users/${uid}/games/${GAME_ID}/${sub}`;

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

// Admin context (rules 回避) で seed する共通ヘルパー
async function seed(path: string, data: Record<string, unknown>): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), data);
  });
}

// =============================================================================
// internal/** — Truth Compiler 出力。Admin SDK 専用、クライアント完全隔離。
// =============================================================================

describe('internal/** — 完全拒否 (匿名 + 任意 uid, read/write)', () => {
  // caseTruth / characterSecrets / timeline / logMetadata + 任意 sub-path を網羅
  const INTERNAL_PATHS = [
    `internal/${GAME_ID}/caseTruth/full`,
    `internal/${GAME_ID}/characterSecrets/char_001`,
    `internal/${GAME_ID}/timeline/evt_001`,
    `internal/${GAME_ID}/logMetadata/log_001`,
    `internal/${GAME_ID}`,
    'internal/arbitrary/deeply/nested/path/doc',
  ];

  describe('未認証 (unauthenticated)', () => {
    for (const path of INTERNAL_PATHS) {
      it(`read 不可: ${path}`, async () => {
        await seed(path, { secret: true });
        const db = testEnv.unauthenticatedContext().firestore();
        await assertFails(getDoc(doc(db, path)));
      });

      it(`write 不可: ${path}`, async () => {
        const db = testEnv.unauthenticatedContext().firestore();
        await assertFails(setDoc(doc(db, path), { secret: true }));
      });
    }
  });

  describe('認証済み・任意 uid (authenticated arbitrary uid)', () => {
    for (const path of INTERNAL_PATHS) {
      it(`read 不可: ${path}`, async () => {
        await seed(path, { secret: true });
        const db = testEnv.authenticatedContext(ALICE_UID).firestore();
        await assertFails(getDoc(doc(db, path)));
      });

      it(`write 不可: ${path}`, async () => {
        const db = testEnv.authenticatedContext(ALICE_UID).firestore();
        await assertFails(setDoc(doc(db, path), { secret: true }));
      });
    }
  });
});

// =============================================================================
// users/{uid}/games/{gameId}/** — owner read のみ、client write 不可、cross-uid 隔離
// =============================================================================

describe('users/{uid}/games/{gameId} — Functions 書き込みコレクション', () => {
  // meta/state は document=** なので階層が一段深い。それ以外は単一 docId。
  const READONLY_SUBPATHS = [
    'meta/state',
    'characters/char_001',
    'publicLogs/log_001',
    'evidence/ev_001',
    'interrogations/intr_001',
    'trials/1',
  ];

  for (const sub of READONLY_SUBPATHS) {
    describe(sub, () => {
      it('owner は read できる', async () => {
        await seed(userGamePath(ALICE_UID, sub), { foo: 'bar' });
        const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
        await assertSucceeds(getDoc(doc(aliceDb, userGamePath(ALICE_UID, sub))));
      });

      it('owner でも client から write 不可 (Functions 経由のみ)', async () => {
        const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
        await assertFails(setDoc(doc(aliceDb, userGamePath(ALICE_UID, sub)), { foo: 'bar' }));
      });

      it('別 uid は read 不可 (cross-uid 隔離)', async () => {
        await seed(userGamePath(ALICE_UID, sub), { foo: 'bar' });
        const bobDb = testEnv.authenticatedContext(BOB_UID).firestore();
        await assertFails(getDoc(doc(bobDb, userGamePath(ALICE_UID, sub))));
      });

      it('別 uid は write 不可 (cross-uid 隔離)', async () => {
        const bobDb = testEnv.authenticatedContext(BOB_UID).firestore();
        await assertFails(setDoc(doc(bobDb, userGamePath(ALICE_UID, sub)), { foo: 'bar' }));
      });

      it('未認証は read 不可', async () => {
        await seed(userGamePath(ALICE_UID, sub), { foo: 'bar' });
        const db = testEnv.unauthenticatedContext().firestore();
        await assertFails(getDoc(doc(db, userGamePath(ALICE_UID, sub))));
      });
    });
  }

  it('users/{uid} ドキュメント本体は owner read のみ / write 不可', async () => {
    await seed(`users/${ALICE_UID}`, { createdAt: 1 });
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    const bobDb = testEnv.authenticatedContext(BOB_UID).firestore();
    await assertSucceeds(getDoc(doc(aliceDb, `users/${ALICE_UID}`)));
    await assertFails(setDoc(doc(aliceDb, `users/${ALICE_UID}`), { createdAt: 2 }));
    await assertFails(getDoc(doc(bobDb, `users/${ALICE_UID}`)));
  });
});

// =============================================================================
// pins — owner write 許可の例外 (推理ノート)
// =============================================================================

describe('users/{uid}/games/{gameId}/pins — owner write 許可', () => {
  const VALID_PIN = { refType: 'log', refId: 'log_001', day: 1 } as const;

  it('owner は valid な pin を create できる', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertSucceeds(setDoc(doc(aliceDb, userGamePath(ALICE_UID, 'pins/pin1')), VALID_PIN));
  });

  it('refType=evidence / day=3 も valid', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertSucceeds(
      setDoc(doc(aliceDb, userGamePath(ALICE_UID, 'pins/pin2')), {
        refType: 'evidence',
        refId: 'ev_001',
        day: 3,
      })
    );
  });

  it('refType=testimony も valid', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertSucceeds(
      setDoc(doc(aliceDb, userGamePath(ALICE_UID, 'pins/pin3')), {
        refType: 'testimony',
        refId: 't_001',
        day: 2,
      })
    );
  });

  it('owner は既存 pin を update できる', async () => {
    await seed(userGamePath(ALICE_UID, 'pins/pin1'), VALID_PIN);
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertSucceeds(
      setDoc(doc(aliceDb, userGamePath(ALICE_UID, 'pins/pin1')), {
        refType: 'evidence',
        refId: 'ev_002',
        day: 2,
      })
    );
  });

  it('owner は既存 pin を delete できる', async () => {
    await seed(userGamePath(ALICE_UID, 'pins/pin1'), VALID_PIN);
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertSucceeds(deleteDoc(doc(aliceDb, userGamePath(ALICE_UID, 'pins/pin1'))));
  });

  it('owner は valid な pin を read できる', async () => {
    await seed(userGamePath(ALICE_UID, 'pins/pin1'), VALID_PIN);
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertSucceeds(getDoc(doc(aliceDb, userGamePath(ALICE_UID, 'pins/pin1'))));
  });

  // ---- invalid pin は拒否 ----
  it('必須フィールド欠落 (refId なし) は拒否', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertFails(
      setDoc(doc(aliceDb, userGamePath(ALICE_UID, 'pins/pin1')), { refType: 'log', day: 1 })
    );
  });

  it('refType が不正だと拒否', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertFails(
      setDoc(doc(aliceDb, userGamePath(ALICE_UID, 'pins/pin1')), {
        refType: 'invalid',
        refId: 'log_001',
        day: 1,
      })
    );
  });

  it('refId が string でないと拒否', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertFails(
      setDoc(doc(aliceDb, userGamePath(ALICE_UID, 'pins/pin1')), {
        refType: 'log',
        refId: 123,
        day: 1,
      })
    );
  });

  it('day が範囲外 (0) だと拒否', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertFails(
      setDoc(doc(aliceDb, userGamePath(ALICE_UID, 'pins/pin1')), {
        refType: 'log',
        refId: 'log_001',
        day: 0,
      })
    );
  });

  it('day が範囲外 (99) だと拒否', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertFails(
      setDoc(doc(aliceDb, userGamePath(ALICE_UID, 'pins/pin1')), {
        refType: 'log',
        refId: 'log_001',
        day: 99,
      })
    );
  });

  it('day が int でない (string) と拒否', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertFails(
      setDoc(doc(aliceDb, userGamePath(ALICE_UID, 'pins/pin1')), {
        refType: 'log',
        refId: 'log_001',
        day: '1',
      })
    );
  });

  // ---- cross-uid ----
  it('別 uid は他人の pins に create できない', async () => {
    const bobDb = testEnv.authenticatedContext(BOB_UID).firestore();
    await assertFails(setDoc(doc(bobDb, userGamePath(ALICE_UID, 'pins/pin1')), VALID_PIN));
  });

  it('別 uid は他人の pins を read できない', async () => {
    await seed(userGamePath(ALICE_UID, 'pins/pin1'), VALID_PIN);
    const bobDb = testEnv.authenticatedContext(BOB_UID).firestore();
    await assertFails(getDoc(doc(bobDb, userGamePath(ALICE_UID, 'pins/pin1'))));
  });

  it('別 uid は他人の pins を delete できない', async () => {
    await seed(userGamePath(ALICE_UID, 'pins/pin1'), VALID_PIN);
    const bobDb = testEnv.authenticatedContext(BOB_UID).firestore();
    await assertFails(deleteDoc(doc(bobDb, userGamePath(ALICE_UID, 'pins/pin1'))));
  });

  it('未認証は pins に write できない', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, userGamePath(ALICE_UID, 'pins/pin1')), VALID_PIN));
  });
});

// =============================================================================
// contradictions — owner write 許可の例外 (矛盾整理)
// =============================================================================

describe('users/{uid}/games/{gameId}/contradictions — owner write 許可', () => {
  const VALID_CONTRADICTION = {
    pinIds: ['pin1', 'pin2'],
    note: 'A の発言と B の証言が食い違う',
  } as const;

  it('owner は valid な contradiction を create できる', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertSucceeds(
      setDoc(doc(aliceDb, userGamePath(ALICE_UID, 'contradictions/c1')), VALID_CONTRADICTION)
    );
  });

  it('pinIds size=6 / note=500 文字 は境界内で valid', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertSucceeds(
      setDoc(doc(aliceDb, userGamePath(ALICE_UID, 'contradictions/c1')), {
        pinIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
        note: 'a'.repeat(500),
      })
    );
  });

  it('note 空文字でも (pinIds が valid なら) 許可', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertSucceeds(
      setDoc(doc(aliceDb, userGamePath(ALICE_UID, 'contradictions/c1')), {
        pinIds: ['pin1', 'pin2'],
        note: '',
      })
    );
  });

  it('owner は既存 contradiction を update できる', async () => {
    await seed(userGamePath(ALICE_UID, 'contradictions/c1'), VALID_CONTRADICTION);
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertSucceeds(
      setDoc(doc(aliceDb, userGamePath(ALICE_UID, 'contradictions/c1')), {
        pinIds: ['pin1', 'pin3'],
        note: '更新',
      })
    );
  });

  it('owner は既存 contradiction を delete できる', async () => {
    await seed(userGamePath(ALICE_UID, 'contradictions/c1'), VALID_CONTRADICTION);
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertSucceeds(deleteDoc(doc(aliceDb, userGamePath(ALICE_UID, 'contradictions/c1'))));
  });

  // ---- invalid ----
  it('pinIds が 2 未満だと拒否', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertFails(
      setDoc(doc(aliceDb, userGamePath(ALICE_UID, 'contradictions/c1')), {
        pinIds: ['pin1'],
        note: '',
      })
    );
  });

  it('pinIds が 6 超だと拒否', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertFails(
      setDoc(doc(aliceDb, userGamePath(ALICE_UID, 'contradictions/c1')), {
        pinIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'],
        note: '',
      })
    );
  });

  it('pinIds が list でないと拒否', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertFails(
      setDoc(doc(aliceDb, userGamePath(ALICE_UID, 'contradictions/c1')), {
        pinIds: 'pin1',
        note: '',
      })
    );
  });

  it('必須フィールド欠落 (note なし) は拒否', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertFails(
      setDoc(doc(aliceDb, userGamePath(ALICE_UID, 'contradictions/c1')), {
        pinIds: ['pin1', 'pin2'],
      })
    );
  });

  it('note が 500 文字超だと拒否', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertFails(
      setDoc(doc(aliceDb, userGamePath(ALICE_UID, 'contradictions/c1')), {
        pinIds: ['pin1', 'pin2'],
        note: 'a'.repeat(501),
      })
    );
  });

  it('note が string でないと拒否', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
    await assertFails(
      setDoc(doc(aliceDb, userGamePath(ALICE_UID, 'contradictions/c1')), {
        pinIds: ['pin1', 'pin2'],
        note: 123,
      })
    );
  });

  // ---- cross-uid ----
  it('別 uid は他人の contradictions に create できない', async () => {
    const bobDb = testEnv.authenticatedContext(BOB_UID).firestore();
    await assertFails(
      setDoc(doc(bobDb, userGamePath(ALICE_UID, 'contradictions/c1')), VALID_CONTRADICTION)
    );
  });

  it('別 uid は他人の contradictions を read できない', async () => {
    await seed(userGamePath(ALICE_UID, 'contradictions/c1'), VALID_CONTRADICTION);
    const bobDb = testEnv.authenticatedContext(BOB_UID).firestore();
    await assertFails(getDoc(doc(bobDb, userGamePath(ALICE_UID, 'contradictions/c1'))));
  });

  it('別 uid は他人の contradictions を delete できない', async () => {
    await seed(userGamePath(ALICE_UID, 'contradictions/c1'), VALID_CONTRADICTION);
    const bobDb = testEnv.authenticatedContext(BOB_UID).firestore();
    await assertFails(deleteDoc(doc(bobDb, userGamePath(ALICE_UID, 'contradictions/c1'))));
  });

  it('未認証は contradictions に write できない', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(doc(db, userGamePath(ALICE_UID, 'contradictions/c1')), VALID_CONTRADICTION)
    );
  });
});

// =============================================================================
// 未許可 top-level path — catch-all で全拒否
// =============================================================================

describe('未許可パス — catch-all 全拒否', () => {
  const RANDOM_PATHS = [
    'randomCollection/doc',
    'misc/something',
    'games/game_alpha', // users 配下でない games は許可されない
    'config/global',
  ];

  for (const path of RANDOM_PATHS) {
    describe(path, () => {
      it('認証済みでも read 不可', async () => {
        await seed(path, { foo: 'bar' });
        const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
        await assertFails(getDoc(doc(aliceDb, path)));
      });

      it('認証済みでも write 不可', async () => {
        const aliceDb = testEnv.authenticatedContext(ALICE_UID).firestore();
        await assertFails(setDoc(doc(aliceDb, path), { foo: 'bar' }));
      });

      it('未認証は read 不可', async () => {
        await seed(path, { foo: 'bar' });
        const db = testEnv.unauthenticatedContext().firestore();
        await assertFails(getDoc(doc(db, path)));
      });

      it('未認証は write 不可', async () => {
        const db = testEnv.unauthenticatedContext().firestore();
        await assertFails(setDoc(doc(db, path), { foo: 'bar' }));
      });
    });
  }
});
