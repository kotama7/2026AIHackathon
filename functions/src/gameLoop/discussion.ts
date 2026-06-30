import type {
  Character,
  DialogueLog,
  DialogueLogMetadata,
  DialogueOutput,
  GameId,
  UserId,
} from '@village/shared';
import { dialogueOutputSchema } from '@village/shared';
import { logger } from 'firebase-functions/v2';

import { internalDb, nowTimestamp, userDb } from '../db/admin.js';
import { TEMPERATURE } from '../llm/geminiClient.js';
import { buildDiscussionPrompt } from '../llm/prompts/speaker/discussion.js';
import { generateStructured } from '../llm/validateAndRetry.js';
import { enforceKnowledgeScope } from './knowledgeScope.js';
import { buildNameById, replaceIdsWithNames } from './nameSanitize.js';

export type GenerateDailyDiscussionArgs = {
  uid: UserId;
  gameId: GameId;
  day: number;
  /** 生存キャラ (議論に参加する全員) */
  characters: Character[];
  /** これまでに既に Firestore に書かれている公開ログ (前日分など) */
  priorLogs: DialogueLog[];
  /** 議論ターン数。デフォルト 4 (各ターン全員 1 発言 → 約 24 発言は多すぎ、ターン制で 2-3 人/ターンに絞ることもあるが MVP は単純に全員 × turns) */
  turns?: number;
};

/**
 * 議論ログを日次で生成する (要件 §10.3 / A3-01)。
 *
 * MVP では「ターンごとに参加者全員が 1 発言ずつする」設計。
 * 1 ターンの生成中は並列で LLM 呼び出しを発射し、ターン終了時に Firestore へ逐次書き込み。
 *
 * 知らない情報を漏らさないよう {@link enforceKnowledgeScope} で検証し、違反時は 1 回まで再生成。
 */
export async function generateDailyDiscussion(
  args: GenerateDailyDiscussionArgs
): Promise<DialogueLog[]> {
  const { uid, gameId, day, characters, priorLogs, turns = 2 } = args;
  const aliveSpeakers = characters.filter((c) => c.isAlive);
  if (aliveSpeakers.length === 0) return [];

  // 全登場人物の id→名前 対応。発言本文に内部ID (char_N) が漏れた場合に名前へ置換する保険。
  const roster = characters.map((c) => ({ id: c.id, name: c.name }));
  const nameById = buildNameById(characters);

  const accumulated: DialogueLog[] = [...priorLogs];
  const generated: DialogueLog[] = [];

  for (let t = 0; t < turns; t++) {
    // ターン内では並列に LLM 呼び出し
    const turnResults = await Promise.all(
      aliveSpeakers.map(async (speaker) => {
        try {
          return await generateOneUtterance({
            speaker,
            priorLogs: accumulated,
            roster,
            nameById,
            goal:
              t === 0
                ? '事件についての第一印象や疑念を述べる'
                : '前のターンの発言を受けて反応・追加意見を述べる',
          });
        } catch (err) {
          logger.warn('[discussion] utterance generation failed, skipping', {
            speakerId: speaker.id,
            err: String(err),
          });
          return null;
        }
      })
    );

    const baseTurn = accumulated.length;
    turnResults.forEach((result, idx) => {
      if (!result) return;
      const speaker = aliveSpeakers[idx]!;
      const now = nowTimestamp();
      const log: DialogueLog = {
        id: `${gameId}_d${day}_log${baseTurn + idx + 1}`,
        day,
        phase: 'discussion',
        turn: baseTurn + idx,
        speakerId: speaker.id,
        ...(result.output.target ? { targetId: result.output.target } : {}),
        text: result.output.utterance,
        intent: result.output.intent,
        confidence: result.output.confidence,
        emotion: result.output.emotion,
        createdAt: now,
      };
      const metadata: DialogueLogMetadata = {
        logId: log.id,
        truthStatus: result.output.truthStatus,
        relatedFacts: result.output.knownFactsUsed,
      };
      generated.push(log);
      accumulated.push(log);
      // 逐次 Firestore 書き込み (ストリーミング表示用)
      void userDb.publicLogs.add(uid, gameId, log).catch((err) => {
        logger.warn('[discussion] publicLogs.add failed', { logId: log.id, err: String(err) });
      });
      void internalDb.logMetadata.add(gameId, metadata).catch((err) => {
        logger.warn('[discussion] logMetadata.add failed', { logId: log.id, err: String(err) });
      });
    });
  }

  logger.info('[discussion] generated', { gameId, day, count: generated.length });
  return generated;
}

async function generateOneUtterance(args: {
  speaker: Character;
  priorLogs: DialogueLog[];
  roster: Array<{ id: string; name: string }>;
  nameById: Map<string, string>;
  goal: string;
}): Promise<{ output: DialogueOutput }> {
  const prompt = buildDiscussionPrompt({
    speaker: args.speaker,
    priorLogs: args.priorLogs,
    goal: args.goal,
    roster: args.roster,
  });
  const { data } = await generateStructured({
    schema: dialogueOutputSchema,
    prompt,
    temperature: TEMPERATURE.SPEAKER,
    maxAttempts: 2,
    traceLabel: `discussion/${args.speaker.id}`,
  });

  // 知識範囲ガード (A3-03)
  const violations = enforceKnowledgeScope(data, args.speaker);
  if (violations.length > 0) {
    logger.warn('[discussion] knowledge scope violation', {
      speakerId: args.speaker.id,
      violations,
    });
    // MVP: 違反時も発言は採用しつつログに残す。完全 retry は重いので validateAndRetry の中だけ。
  }

  // 発言本文に内部ID (char_N / victim_N) が漏れていたら名前へ置換する (保険)。
  const sanitized: DialogueOutput = {
    ...data,
    utterance: replaceIdsWithNames(data.utterance, args.nameById),
  };
  return { output: sanitized };
}
