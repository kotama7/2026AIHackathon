import { describe, expect, it, jest } from '@jest/globals';

/**
 * userDb の書き込みを mock して startNewGame の振る舞いを検証。
 * Firestore に実接続する統合テストは A1-07 / A2-12 で別途。
 */
const setMeta = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const setChar = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const addManyEvidence = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const addLog = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);

jest.unstable_mockModule('../src/db/admin.js', () => ({
  userDb: {
    meta: { set: setMeta },
    characters: { set: setChar },
    evidence: { addMany: addManyEvidence },
    publicLogs: { add: addLog },
  },
  nowTimestamp: () => ({
    seconds: 1700000000,
    nanoseconds: 0,
    toDate: () => new Date(1700000000 * 1000),
    toMillis: () => 1700000000 * 1000,
  }),
}));

const functionsTestInit = (await import('firebase-functions-test')).default;
const { startNewGame } = await import('../src/index.js');
const testEnv = functionsTestInit();

describe('startNewGame (stub)', () => {
  beforeEach(() => {
    setMeta.mockClear();
    setChar.mockClear();
    addManyEvidence.mockClear();
    addLog.mockClear();
  });

  it('未認証で unauthenticated エラー', async () => {
    const wrapped = testEnv.wrap(startNewGame);
    await expect(wrapped({ data: {} })).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  it('認証済みで gameId + 6 人 + 3 証拠 + 5 ログを返す', async () => {
    const wrapped = testEnv.wrap(startNewGame);
    const result = (await wrapped({
      auth: { uid: 'test-user-uid', token: { firebase: { sign_in_provider: 'anonymous' } } },
      data: {},
    })) as Awaited<ReturnType<typeof startNewGame>>;

    expect(result.gameId).toHaveLength(20);
    expect(result.characters).toHaveLength(6);
    expect(result.initialEvidence).toHaveLength(3);
    expect(result.initialLogs).toHaveLength(5);
    expect(result.meta.uid).toBe('test-user-uid');
    expect(result.meta.currentDay).toBe(1);
    expect(result.meta.remainingPoints).toBe(5);

    // Firestore 書き込み呼び出しの検証
    expect(setMeta).toHaveBeenCalledTimes(1);
    expect(setChar).toHaveBeenCalledTimes(6);
    expect(addManyEvidence).toHaveBeenCalledTimes(1);
    expect(addLog).toHaveBeenCalledTimes(5);
  });

  it('secret / private_goal などの内部情報がレスポンスに含まれない', async () => {
    const wrapped = testEnv.wrap(startNewGame);
    const result = (await wrapped({
      auth: { uid: 'test-user-uid', token: {} },
      data: {},
    })) as Awaited<ReturnType<typeof startNewGame>>;
    for (const c of result.characters) {
      expect(c).not.toHaveProperty('secret');
      expect(c).not.toHaveProperty('privateGoal');
      expect(c).not.toHaveProperty('isWerewolf');
    }
  });
});
