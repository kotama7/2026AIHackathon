import type {
  CharacterPublic,
  DialogueLog,
  EvidencePublic,
  GameId,
  GameMeta,
  StartNewGameRequest,
  StartNewGameResponse,
  UserId,
} from '@village/shared';
import { FUNCTIONS_REGION, INITIAL_INTERROGATION_POINTS } from '@village/shared';
import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { internalDb, nowTimestamp, userDb } from '../db/admin.js';
import { GEMINI_API_KEY } from '../llm/secrets.js';
import {
  buildDummyCharacters,
  buildDummyEvidence,
  buildDummyLogs,
  buildInitialMeta,
} from '../seed/dummyGame.js';
import { compileCaseTruth, TruthCompilerError } from '../truthCompiler/index.js';

/**
 * A2-12: startNewGame 本実装。
 *
 * Truth Compiler で固定真相を生成・検証し、
 * - 内部 (internal/): caseTruth 全体 / characterSecrets / timeline
 * - 公開 (users/{uid}/games/): meta / characters(public) / evidence(Day1) / publicLogs
 * に分割保存する。
 *
 * useSeed=true のときは Truth Compiler を呼ばずデモ用シードゲーム (A1-05 の固定データ) を起動。
 * Truth Compiler は重いため memory 1GiB / timeout 540s。
 */
export const startNewGame = onCall<StartNewGameRequest, Promise<StartNewGameResponse>>(
  {
    region: FUNCTIONS_REGION,
    memory: '1GiB',
    timeoutSeconds: 540,
    secrets: [GEMINI_API_KEY],
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'サインインが必要です');
    }

    const gameId = generateGameId();

    if (request.data?.useSeed) {
      return startSeedGame(uid, gameId, request.data);
    }

    logger.info('startNewGame (truth compiler) called', { uid, gameId, payload: request.data });

    let caseTruth;
    try {
      const result = await compileCaseTruth({
        caseId: gameId,
        difficulty: request.data?.difficulty ?? 'normal',
      });
      caseTruth = result.caseTruth;
      logger.info('truth compiled', { gameId, metrics: summarizeMetrics(result.metrics) });
    } catch (err) {
      if (err instanceof TruthCompilerError) {
        logger.error('truth compiler failed', { gameId, cycles: err.cycles });
        // P5-07: フォールバックとしてシードゲームを提示できるよう code を添える
        throw new HttpsError(
          'internal',
          '事件の構築に失敗しました。もう一度お試しいただくか、デモ用シードゲームを起動してください。',
          { code: 'truth_compiler_failure' }
        );
      }
      throw new HttpsError('internal', '事件の生成中にエラーが発生しました', {
        code: 'internal_error',
      });
    }

    const publicChars = caseTruth.characters.map(toCharacterPublic);
    const day1Evidence = caseTruth.evidence
      .filter((e) => e.day === 1)
      .map(toEvidencePublic)
      .slice(0, 3);
    const initialLogs = buildPlaceholderLogs(gameId, publicChars);
    const meta = buildRealMeta(uid, gameId, publicChars);

    await Promise.all([
      // --- internal/ (Functions 専用) ---
      internalDb.caseTruth.set(gameId, caseTruth),
      internalDb.characterSecrets.setMany(gameId, caseTruth.characters),
      internalDb.timeline.setMany(gameId, caseTruth.timeline),
      // --- users/{uid}/games/{gameId}/ (クライアント可視) ---
      userDb.meta.set(uid, gameId, meta),
      ...publicChars.map((c) => userDb.characters.set(uid, gameId, c.id, c)),
      userDb.evidence.addMany(uid, gameId, day1Evidence),
      ...initialLogs.map((l) => userDb.publicLogs.add(uid, gameId, l)),
    ]);

    return {
      gameId,
      meta,
      characters: publicChars,
      initialEvidence: day1Evidence,
      initialLogs,
    };
  }
);

// =============================================================================
// シードゲーム (useSeed=true)
// =============================================================================

async function startSeedGame(
  uid: UserId,
  gameId: GameId,
  payload: StartNewGameRequest
): Promise<StartNewGameResponse> {
  logger.info('startNewGame (seed) called', { uid, gameId, payload });
  const characters = buildDummyCharacters();
  const evidence = buildDummyEvidence(gameId);
  const logs = buildDummyLogs(gameId);
  const meta = buildInitialMeta(uid, gameId);

  await Promise.all([
    userDb.meta.set(uid, gameId, meta),
    ...characters.map((c) => userDb.characters.set(uid, gameId, c.id, c)),
    userDb.evidence.addMany(uid, gameId, evidence),
    ...logs.map((l) => userDb.publicLogs.add(uid, gameId, l)),
  ]);

  return { gameId, meta, characters, initialEvidence: evidence, initialLogs: logs };
}

// =============================================================================
// helpers
// =============================================================================

/** Character → CharacterPublic (secret/private_goal などの内部情報を落とす)。 */
function toCharacterPublic(c: CharacterPublic): CharacterPublic {
  return {
    id: c.id,
    name: c.name,
    publicPersonality: c.publicPersonality,
    speakingStyle: c.speakingStyle,
    socialRole: c.socialRole,
    ...(c.accentColor ? { accentColor: c.accentColor } : {}),
    isAlive: c.isAlive,
    trustToPlayer: c.trustToPlayer,
  };
}

/** Evidence → EvidencePublic (pointsTo/weight/trueInterpretation などを落とす)。 */
function toEvidencePublic(e: EvidencePublic): EvidencePublic {
  return {
    id: e.id,
    day: e.day,
    name: e.name,
    description: e.description,
    reliability: e.reliability,
    relatedCharacters: e.relatedCharacters,
  };
}

function buildRealMeta(uid: UserId, gameId: GameId, chars: CharacterPublic[]): GameMeta {
  const now = nowTimestamp();
  return {
    gameId,
    uid,
    currentDay: 1,
    currentPhase: 'morning',
    remainingPoints: INITIAL_INTERROGATION_POINTS,
    aliveCharacters: chars.map((c) => c.id),
    villageTrust: 50,
    status: 'in_progress',
    isSeedGame: false,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Day1 朝の初期議論ログ (プレースホルダ)。
 * 本物の議論生成は A3-01 に依存するため、それまでは噂レベルの定型文を入れる。
 */
function buildPlaceholderLogs(gameId: GameId, chars: CharacterPublic[]): DialogueLog[] {
  const now = nowTimestamp();
  const texts = [
    '事件についての噂が村に広まっている。',
    '昨夜、誰かが外を歩いていたという話だ。',
    '私たちの中に、何か隠している者がいるのだろうか。',
    'まだ何も分からない。落ち着いて考えよう。',
    '監査官殿、どうか真実を明らかにしてほしい。',
  ];
  return texts.map((text, i) => {
    const speaker = chars[i % chars.length]!;
    return {
      id: `${gameId}_log${(i + 1).toString().padStart(2, '0')}`,
      day: 1,
      phase: 'discussion',
      turn: i,
      speakerId: speaker.id,
      text,
      intent: 'observation',
      confidence: 0.4,
      emotion: 'tense',
      createdAt: now,
    };
  });
}

function summarizeMetrics(m: {
  cycles: number;
  repairCount: number;
  regenCount: number;
  totalDurationMs: number;
}): Record<string, number> {
  return {
    cycles: m.cycles,
    repairCount: m.repairCount,
    regenCount: m.regenCount,
    totalDurationMs: m.totalDurationMs,
  };
}

/** Firestore auto-id 互換の 20 文字 ID */
function generateGameId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 20; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
