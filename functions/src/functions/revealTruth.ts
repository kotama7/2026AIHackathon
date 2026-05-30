import type {
  CaseTruth,
  CharacterPublic,
  EvidencePublic,
  InterrogationAction,
  RevealTruthRequest,
  RevealTruthResponse,
  TrialDecision,
} from '@village/shared';
import { FUNCTIONS_REGION } from '@village/shared';
import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { internalDb, userDb } from '../db/admin.js';
import { calculateScore } from '../gameLoop/score.js';
import { callGemini } from '../llm/geminiClient.js';
import { buildTruthSummaryPrompt } from '../llm/prompts/speaker/truthSummary.js';
import { GEMINI_API_KEY } from '../llm/secrets.js';

/**
 * A4-06: revealTruth 完成版。
 *
 * フロー:
 *   1. 認証 + status !== 'in_progress' 検証
 *   2. caseTruth / characters / evidence / interrogations / trials を全部取得
 *   3. truthSummary を LLM で生成 (temperature 0.3)
 *   4. characterReveals / lieReveals / evidenceReveals / deductionPath を組み立て
 *   5. calculateScore で score + rank を計算
 *   6. RevealTruthResponse を返す
 */
export const revealTruth = onCall<RevealTruthRequest, Promise<RevealTruthResponse>>(
  {
    region: FUNCTIONS_REGION,
    timeoutSeconds: 60,
    secrets: [GEMINI_API_KEY],
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'サインインが必要です');
    const { gameId } = request.data;

    // ---- 1. validation ----
    const meta = await userDb.meta.get(uid, gameId);
    if (!meta) {
      throw new HttpsError('not-found', 'ゲームが見つかりません', { code: 'game_not_found' });
    }
    if (meta.status === 'in_progress') {
      throw new HttpsError('failed-precondition', 'ゲームはまだ終了していません', {
        code: 'invalid_phase',
      });
    }

    // ---- 2. データ取得 ----
    const [caseTruth, charactersPublic] = await Promise.all([
      internalDb.caseTruth.get(gameId),
      userDb.characters.list(uid, gameId),
    ]);
    if (!caseTruth) {
      throw new HttpsError('not-found', '事件真相データがありません', { code: 'internal_error' });
    }

    const interrogations = await listInterrogations(uid, gameId);
    const trials = await listTrials(uid, gameId);
    const collectedEvidence = await listEvidence(uid, gameId);

    // ---- 3. truthSummary LLM ----
    const summaryOutcome = mapStatusToSummaryOutcome(meta.status);
    let truthSummary = '事件は解決した。';
    try {
      const summaryResult = await callGemini({
        prompt: buildTruthSummaryPrompt({ caseTruth, outcome: summaryOutcome }),
        temperature: 0.3,
        maxOutputTokens: 400,
        traceLabel: `revealTruth/${gameId}/summary`,
      });
      truthSummary = summaryResult.text.trim();
    } catch (err) {
      logger.warn('[revealTruth] truth summary generation failed, using fallback', {
        gameId,
        err: String(err),
      });
    }

    // ---- 4. reveals 組み立て ----
    const publicByCharId = new Map(charactersPublic.map((c) => [c.id, c] as const));
    const werewolf = pickWerewolfPublic(caseTruth, publicByCharId);

    const characterReveals = caseTruth.characters.map((c) => {
      const publicEntry = publicByCharId.get(c.id) ?? toPublic(c);
      return {
        character: publicEntry,
        secret: c.secret,
        privateGoal: c.privateGoal,
        fear: c.fear,
      };
    });

    const lieReveals = caseTruth.plannedLies.map((l) => ({
      speakerId: l.liarId,
      content: l.content,
      reason: l.reason,
      hiddenTruth: l.hiddenTruth,
    }));

    const evidenceReveals = caseTruth.evidence.map((e) => ({
      evidence: toEvidencePublic(e),
      trueInterpretation: e.trueInterpretation,
    }));

    // ---- 推理経路 比較: プレイヤーが該当証拠/証言を取得済みか ----
    const playerEvidenceIds = new Set(collectedEvidence.map((e) => e.id));
    const playerTestimonyIds = collectPlayerObservedTestimonyIds(interrogations, trials);

    const deductionPath = caseTruth.deductionPath.steps.map((step) => ({
      ...step,
      playerHadAllEvidence: step.requiredEvidence.every((id) => playerEvidenceIds.has(id)),
      playerHadAllTestimonies: step.requiredTestimonies.every((id) => playerTestimonyIds.has(id)),
    }));

    // ---- 5. score ----
    const { breakdown, rank } = calculateScore({
      meta: { currentDay: meta.currentDay, villageTrust: meta.villageTrust, status: meta.status },
      characters: charactersPublic,
      caseTruth,
      interrogations,
      trials,
    });

    return {
      werewolf,
      truthSummary,
      characterReveals,
      lieReveals,
      evidenceReveals,
      deductionPath,
      score: breakdown,
      rank,
    };
  }
);

// =============================================================================
// helpers
// =============================================================================

function mapStatusToSummaryOutcome(
  status: string
): 'won' | 'lost_werewolf_survived' | 'lost_too_few_villagers' | 'lost_trust_collapsed' {
  if (
    status === 'won' ||
    status === 'lost_werewolf_survived' ||
    status === 'lost_too_few_villagers' ||
    status === 'lost_trust_collapsed'
  ) {
    return status;
  }
  // corrupted など想定外は werewolf_survived 扱いにする
  return 'lost_werewolf_survived';
}

function toPublic(c: CaseTruth['characters'][number]): CharacterPublic {
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

function pickWerewolfPublic(
  caseTruth: CaseTruth,
  publicMap: Map<string, CharacterPublic>
): CharacterPublic {
  const werewolfId = caseTruth.summary.werewolfId;
  const entry = publicMap.get(werewolfId);
  if (entry) return entry;
  const internal = caseTruth.characters.find((c) => c.id === werewolfId);
  if (!internal) {
    throw new HttpsError('internal', '人狼の内部データが不整合です', { code: 'internal_error' });
  }
  return toPublic(internal);
}

function toEvidencePublic(e: CaseTruth['evidence'][number]): EvidencePublic {
  return {
    id: e.id,
    day: e.day,
    name: e.name,
    description: e.description,
    reliability: e.reliability,
    relatedCharacters: e.relatedCharacters,
  };
}

async function listInterrogations(uid: string, gameId: string): Promise<InterrogationAction[]> {
  const snap = await userDb.interrogations.col(uid, gameId).get();
  return snap.docs.map((d) => d.data() as InterrogationAction);
}

async function listTrials(uid: string, gameId: string): Promise<TrialDecision[]> {
  // trials/day{day} 形式の doc を全部読む
  const colPath = userDb.trials.ref(uid, gameId, 1).parent;
  if (!colPath) return [];
  const snap = await colPath.get();
  return snap.docs.map((d) => d.data() as TrialDecision);
}

async function listEvidence(uid: string, gameId: string): Promise<EvidencePublic[]> {
  const snap = await userDb.evidence.col(uid, gameId).get();
  return snap.docs.map((d) => d.data() as EvidencePublic);
}

/**
 * プレイヤーが「観測した」testimony ID 群を集める。
 * - 尋問の matched contradictionIds (contradiction 質問で提示したもの)
 * - 裁判で提示した contradictions
 * 議論ログの testimony は character 知識として持つもので、プレイヤーが UI で確認したかは
 * 区別できないため、保守的に「明示的に使った」ものだけを「持っていた」とみなす。
 */
function collectPlayerObservedTestimonyIds(
  interrogations: InterrogationAction[],
  trials: TrialDecision[]
): Set<string> {
  const set = new Set<string>();
  for (const ix of interrogations) {
    for (const id of ix.presentedContradictionIds ?? []) set.add(id);
  }
  for (const t of trials) {
    for (const id of t.presentedContradictions) set.add(id);
  }
  return set;
}
