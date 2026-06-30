import type {
  CaseTruth,
  CharacterId,
  DialogueLog,
  EvidencePublic,
  GameId,
  TimelineEvent,
  UserId,
} from '@village/shared';
import { logger } from 'firebase-functions/v2';

import { internalDb, userDb } from '../db/admin.js';
import { generateDailyDiscussion } from './discussion.js';

export type ProcessNightArgs = {
  uid: UserId;
  gameId: GameId;
  /** 監視を行った日 (現在の日)。翌朝は day + 1 になる */
  day: number;
  watchTargetId: CharacterId;
  caseTruth: CaseTruth;
};

export type ProcessNightResult = {
  /** 監視結果のテキスト (UI で翌朝モーダル表示) */
  watchResult: string;
  /** 翌朝公開する追加証拠 */
  nextDayEvidence: EvidencePublic[];
  /** 翌朝の初期議論ログ (Firestore には逐次書き込み済み) */
  nextDayLogs: DialogueLog[];
};

/**
 * A3-06: 夜間処理。
 *
 * - 監視対象に応じた手がかりテキスト生成（timeline event を参照）
 * - 翌朝公開する証拠 (caseTruth.evidence の day === day+1 のものから 1〜2 枚) を Firestore に追加
 * - 翌朝の議論ログを {@link generateDailyDiscussion} で生成
 *
 * MVP: Day 2/3 で人狼の追加襲撃は行わない（被害者は Day 1 のみ固定）。
 */
export async function processNight(args: ProcessNightArgs): Promise<ProcessNightResult> {
  const { uid, gameId, day, watchTargetId, caseTruth } = args;
  const nextDay = day + 1;

  // ---- 監視結果 ----
  const timeline = await internalDb.timeline.list(gameId);
  const watchResult = buildWatchResult(watchTargetId, timeline, caseTruth);

  // ---- 翌朝の追加証拠 ----
  const nextDayEvidence: EvidencePublic[] = caseTruth.evidence
    .filter((e) => e.day === nextDay)
    .slice(0, 2)
    .map(toEvidencePublic);

  if (nextDayEvidence.length > 0) {
    await userDb.evidence.addMany(uid, gameId, nextDayEvidence);
  }

  // ---- 翌朝議論 ----
  const aliveIds = new Set(caseTruth.characters.filter((c) => c.isAlive).map((c) => c.id));
  const aliveCharacters = caseTruth.characters.filter((c) => aliveIds.has(c.id));
  let nextDayLogs: DialogueLog[] = [];
  try {
    nextDayLogs = await generateDailyDiscussion({
      uid,
      gameId,
      day: nextDay,
      characters: aliveCharacters,
      priorLogs: [],
      turns: 2,
    });
  } catch (err) {
    logger.error('[night] generateDailyDiscussion failed, returning empty logs', {
      gameId,
      day: nextDay,
      err: String(err),
    });
  }

  return { watchResult, nextDayEvidence, nextDayLogs };
}

/**
 * 監視対象の Day 1 夜の動きを timeline から拾い、自然文に組み立てる。
 *
 * - 人狼を監視 → 攻撃の経路を匂わせる重要手がかり
 * - 被害者を監視 → 被害現場での挙動
 * - その他 → 観察ログのみ
 */
function buildWatchResult(
  watchTargetId: CharacterId,
  timeline: TimelineEvent[],
  caseTruth: CaseTruth
): string {
  // 監視結果はプレイヤーが読むテキストなので内部ID (char_N) でなく名前で表示する。
  const targetName =
    caseTruth.characters.find((c) => c.id === watchTargetId)?.name ?? watchTargetId;

  const events = timeline
    .filter((e) => e.character === watchTargetId)
    .sort((a, b) => a.time.localeCompare(b.time));

  if (events.length === 0) {
    return `${targetName} は夜の間、特に不審な動きを見せなかった。あなたの監視からは何も得られなかった。`;
  }

  const isWerewolf = watchTargetId === caseTruth.summary.werewolfId;
  const isVictim = watchTargetId === caseTruth.summary.victimId;

  const eventLines = events.map((e) => `  - ${e.time} @ ${e.location}: ${e.action}`).join('\n');

  if (isWerewolf) {
    return `あなたは ${targetName} を一晩中監視していた。\n以下の動きが観察された:\n${eventLines}\n\n— この一連の行動には不自然な点が多く、決定的な手がかりとなり得る。`;
  }
  if (isVictim) {
    return `あなたは ${targetName} を監視していたが、夜半に被害者となった。\n最後に観察された動き:\n${eventLines}`;
  }
  return `あなたは ${targetName} を監視した。観察された動き:\n${eventLines}\n\n— 特に決定的な手がかりは得られなかった。`;
}

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
