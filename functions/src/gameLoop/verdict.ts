import type {
  CaseTruth,
  CharacterId,
  CharacterPublic,
  GameId,
  GameMeta,
  GameStatus,
  TrialDecision,
  UserId,
  Verdict,
} from '@village/shared';
import { logger } from 'firebase-functions/v2';

import { nowTimestamp, runTransaction, userDb } from '../db/admin.js';
import { applyTrustDelta, calculateTrustDelta, type TrustAction } from '../trust/index.js';
import { evaluateGameStatus } from './winLose.js';

export type ProcessVerdictArgs = {
  uid: UserId;
  gameId: GameId;
  day: number;
  suspectId: CharacterId;
  verdict: Verdict;
  presentedEvidence: TrialDecision['presentedEvidence'];
  presentedContradictions: TrialDecision['presentedContradictions'];
  defenseText: string;
  reactions: TrialDecision['reactions'];
  caseTruth: CaseTruth;
};

export type ProcessVerdictResult = {
  /** verdict === 'execute' のとき: 人狼を当てたか */
  wasCorrect?: boolean;
  /** ゲーム終了したか */
  outcome: 'continue' | 'won' | 'lost';
  /** 終了した場合の最終ステータス */
  finalStatus?: GameStatus;
};

/**
 * A4-03: 裁判判決を Firestore に確定し、勝敗判定まで実行。
 *
 * - verdict === 'execute':
 *   1. 容疑者を aliveCharacters / characters[id].isAlive から除外
 *   2. trustDelta を applyTrustDelta で適用 (人狼処刑なら +20、村人誤処刑なら -30)
 *   3. evaluateGameStatus(trigger='trial_execute') で勝敗評価
 *   4. trials/{day} に TrialDecision を保存
 * - verdict === 'hold': 信頼度更新せず、in_progress を維持。trials/{day} は保存
 *
 * Firestore 更新は read を先にしてから transaction にまとめる。
 */
export async function processVerdict(args: ProcessVerdictArgs): Promise<ProcessVerdictResult> {
  const { uid, gameId, day, suspectId, verdict, caseTruth } = args;

  if (verdict === 'hold') {
    await saveTrialDecision(args, { wasCorrect: undefined });
    return { outcome: 'continue' };
  }

  // ---- execute ----
  const werewolfId = caseTruth.summary.werewolfId;
  const wasCorrect = suspectId === werewolfId;

  // 1. characters の isAlive 更新 + meta.aliveCharacters 除外 (transaction)
  await runTransaction(async (tx) => {
    const metaRef = userDb.meta.ref(uid, gameId);
    const charRef = userDb.characters.ref(uid, gameId, suspectId);
    const [metaSnap, charSnap] = await Promise.all([tx.get(metaRef), tx.get(charRef)]);
    if (!metaSnap.exists) throw new Error(`meta not found: ${gameId}`);
    const meta = metaSnap.data() as GameMeta;
    const nextAlive = meta.aliveCharacters.filter((id) => id !== suspectId);
    tx.update(metaRef, { aliveCharacters: nextAlive, updatedAt: nowTimestamp() });
    if (charSnap.exists) {
      tx.update(charRef, { isAlive: false });
    }
  });

  // 2. 信頼度更新
  const trustAction: TrustAction = wasCorrect
    ? { kind: 'execute_werewolf' }
    : { kind: 'execute_villager' };
  try {
    const delta = calculateTrustDelta(trustAction);
    await applyTrustDelta(uid, gameId, delta);
  } catch (err) {
    logger.warn('[verdict] applyTrustDelta failed', { gameId, err: String(err) });
  }

  // 3. 最新 meta / characters を再取得して勝敗判定
  const [meta, characters] = await Promise.all([
    userDb.meta.get(uid, gameId),
    userDb.characters.list(uid, gameId),
  ]);
  if (!meta) throw new Error(`meta vanished mid-verdict: ${gameId}`);

  const evalResult = evaluateGameStatus({
    trigger: 'trial_execute',
    meta,
    characters,
    caseTruth,
    executedCharacterId: suspectId,
  });

  // 4. status 更新が必要なら適用
  let outcome: ProcessVerdictResult['outcome'] = 'continue';
  let finalStatus: GameStatus | undefined;
  if (evalResult.status !== 'in_progress') {
    finalStatus = evalResult.status;
    outcome = evalResult.status === 'won' ? 'won' : 'lost';
    await userDb.meta.update(uid, gameId, {
      status: finalStatus,
      currentPhase: 'result',
      updatedAt: nowTimestamp(),
    });
  } else {
    // 継続時はサーバ phase を night へ確定する。以前は phase を据え置き、UI ヘッダーの
    // blind な advancePhase(trial→night) に依存していたため、ゲーム終了を確定する判定処理と
    // 競合し (race)、夜フェーズで submitNightAction が phase 不一致 400 を繰り返していた。
    await userDb.meta.update(uid, gameId, {
      currentPhase: 'night',
      updatedAt: nowTimestamp(),
    });
  }

  logger.info('[verdict] processed', {
    gameId,
    day,
    suspectId,
    wasCorrect,
    outcome,
    finalStatus,
    reason: evalResult.reason,
  });

  // 5. trial 保存
  await saveTrialDecision(args, { wasCorrect });

  return {
    wasCorrect,
    outcome,
    ...(finalStatus ? { finalStatus } : {}),
  };
}

async function saveTrialDecision(
  args: ProcessVerdictArgs,
  extra: { wasCorrect?: boolean }
): Promise<void> {
  const trial: TrialDecision = {
    day: args.day,
    suspectId: args.suspectId,
    presentedEvidence: args.presentedEvidence,
    presentedContradictions: args.presentedContradictions,
    verdict: args.verdict,
    ...(extra.wasCorrect !== undefined ? { wasCorrect: extra.wasCorrect } : {}),
    defenseText: args.defenseText,
    reactions: args.reactions,
    createdAt: nowTimestamp(),
  };
  await userDb.trials.set(args.uid, args.gameId, args.day, trial);
}

// re-export used types for callers
export type { CharacterPublic };
