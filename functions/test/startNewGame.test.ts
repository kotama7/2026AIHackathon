import { describe, expect, it, jest } from '@jest/globals';

import { makeValidCaseTruth } from './fixtures/caseTruth.js';

/**
 * A2-12: startNewGame 本実装。
 * Truth Compiler (compileCaseTruth) と Firestore 書き込みを mock し、
 * 内部/公開コレクションへの分割保存とレスポンス形状を検証する。
 */
const compileCaseTruth =
  jest.fn<() => Promise<{ caseTruth: ReturnType<typeof makeValidCaseTruth>; metrics: unknown }>>();

class TruthCompilerError extends Error {
  constructor(
    message: string,
    public readonly cycles = 3,
    public readonly lastIssues: unknown[] = []
  ) {
    super(message);
    this.name = 'TruthCompilerError';
  }
}

jest.unstable_mockModule('../src/truthCompiler/index.js', () => ({
  compileCaseTruth,
  TruthCompilerError,
}));

// Firestore 書き込み mock
const setMeta = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const setChar = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const addManyEvidence = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const addLog = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const setCaseTruth = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const setManySecrets = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const setManyTimeline = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);

jest.unstable_mockModule('../src/db/admin.js', () => ({
  userDb: {
    meta: { set: setMeta, get: jest.fn(), update: jest.fn(), ref: jest.fn() },
    characters: {
      set: setChar,
      list: jest.fn(),
      ref: jest.fn(),
      col: jest.fn(),
    },
    evidence: { addMany: addManyEvidence },
    publicLogs: { add: addLog, col: jest.fn() },
    interrogations: { add: jest.fn(), col: jest.fn() },
  },
  internalDb: {
    caseTruth: { set: setCaseTruth, get: jest.fn(), ref: jest.fn() },
    characterSecrets: { setMany: setManySecrets, get: jest.fn(), col: jest.fn() },
    timeline: { setMany: setManyTimeline, list: jest.fn(), get: jest.fn(), col: jest.fn() },
    logMetadata: { add: jest.fn(), col: jest.fn() },
  },
  nowTimestamp: () => ({
    seconds: 1700000000,
    nanoseconds: 0,
    toDate: () => new Date(1700000000 * 1000),
    toMillis: () => 1700000000 * 1000,
  }),
  // A3-04/05/08/09 で追加: transaction ヘルパ。
  // この test では使わないので空 mock で import エラーを回避するだけ。
  runTransaction: jest.fn(),
  adminDb: {},
  serverTimestamp: jest.fn(),
  toTimestamp: jest.fn(),
  FieldValue: {},
  Timestamp: {},
}));

const functionsTestInit = (await import('firebase-functions-test')).default;
const { startNewGame } = await import('../src/index.js');
const testEnv = functionsTestInit();

const authedCall = { auth: { uid: 'test-user-uid', token: {} }, data: {} } as const;

describe('startNewGame (truth compiler)', () => {
  beforeEach(() => {
    setMeta.mockClear();
    setChar.mockClear();
    addManyEvidence.mockClear();
    addLog.mockClear();
    setCaseTruth.mockClear();
    setManySecrets.mockClear();
    setManyTimeline.mockClear();
    compileCaseTruth.mockReset();
    compileCaseTruth.mockResolvedValue({
      caseTruth: makeValidCaseTruth({ caseId: 'ignored' }),
      metrics: { cycles: 1, repairCount: 0, regenCount: 0, totalDurationMs: 100 },
    });
  });

  it('未認証で unauthenticated エラー', async () => {
    const wrapped = testEnv.wrap(startNewGame);
    await expect(wrapped({ data: {} })).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('認証済みで gameId + 6 人 public + Day1 証拠 3 枚 + 5 ログを返す', async () => {
    const wrapped = testEnv.wrap(startNewGame);
    const result = (await wrapped(authedCall)) as Awaited<ReturnType<typeof startNewGame>>;

    expect(result.gameId).toHaveLength(20);
    expect(result.characters).toHaveLength(6);
    expect(result.initialEvidence).toHaveLength(3); // fixture Day1 = ev_c1/ev_c2/ev_n1
    expect(result.initialLogs).toHaveLength(5);
    expect(result.meta.currentDay).toBe(1);
    expect(result.meta.currentPhase).toBe('morning');
    expect(result.meta.remainingPoints).toBe(5);
    expect(result.meta.aliveCharacters).toHaveLength(6);
    expect(result.meta.isSeedGame).toBe(false);
  });

  it('internal/ と users/ の両方へ分割保存する', async () => {
    const wrapped = testEnv.wrap(startNewGame);
    await wrapped(authedCall);

    expect(setCaseTruth).toHaveBeenCalledTimes(1);
    expect(setManySecrets).toHaveBeenCalledTimes(1);
    expect(setManyTimeline).toHaveBeenCalledTimes(1);
    expect(setMeta).toHaveBeenCalledTimes(1);
    expect(setChar).toHaveBeenCalledTimes(6);
    expect(addManyEvidence).toHaveBeenCalledTimes(1);
    expect(addLog).toHaveBeenCalledTimes(5);

    // caseTruth.set には gameId が caseId として渡る
    const savedGameId = setCaseTruth.mock.calls[0]?.[0];
    expect(typeof savedGameId).toBe('string');
  });

  it('公開キャラに secret / private_goal / isWerewolf が含まれない', async () => {
    const wrapped = testEnv.wrap(startNewGame);
    const result = (await wrapped(authedCall)) as Awaited<ReturnType<typeof startNewGame>>;
    for (const c of result.characters) {
      expect(c).not.toHaveProperty('secret');
      expect(c).not.toHaveProperty('privateGoal');
      expect(c).not.toHaveProperty('isWerewolf');
      expect(c).not.toHaveProperty('knownFacts');
    }
  });

  it('公開証拠に pointsTo / weight / trueInterpretation が含まれない', async () => {
    const wrapped = testEnv.wrap(startNewGame);
    const result = (await wrapped(authedCall)) as Awaited<ReturnType<typeof startNewGame>>;
    for (const e of result.initialEvidence) {
      expect(e).not.toHaveProperty('pointsTo');
      expect(e).not.toHaveProperty('weight');
      expect(e).not.toHaveProperty('trueInterpretation');
      expect(e).not.toHaveProperty('sourceTimelineEvent');
    }
  });

  it('Truth Compiler 失敗時は truth_compiler_failure を返す', async () => {
    compileCaseTruth.mockRejectedValueOnce(new TruthCompilerError('全滅', 3, []));
    const wrapped = testEnv.wrap(startNewGame);
    await expect(wrapped(authedCall)).rejects.toMatchObject({
      details: { code: 'truth_compiler_failure' },
    });
    // 失敗時は何も保存しない
    expect(setCaseTruth).not.toHaveBeenCalled();
    expect(setMeta).not.toHaveBeenCalled();
  });

  it('useSeed=true なら Truth Compiler を呼ばずシードゲームを起動', async () => {
    const wrapped = testEnv.wrap(startNewGame);
    const result = (await wrapped({
      auth: { uid: 'test-user-uid', token: {} },
      data: { useSeed: true },
    })) as Awaited<ReturnType<typeof startNewGame>>;
    expect(compileCaseTruth).not.toHaveBeenCalled();
    expect(result.characters).toHaveLength(6);
    expect(setCaseTruth).not.toHaveBeenCalled(); // seed は internal を書かない
  });
});
