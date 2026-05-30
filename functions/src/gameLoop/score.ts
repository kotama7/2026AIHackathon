import type {
  CaseTruth,
  CharacterPublic,
  GameMeta,
  InterrogationAction,
  ScoreBreakdown,
  ScoreRank,
  Testimony,
  TrialDecision,
} from '@village/shared';

import { isCorrectContradiction } from '../trust/contradiction.js';

export type CalculateScoreArgs = {
  meta: Pick<GameMeta, 'currentDay' | 'villageTrust' | 'status'>;
  characters: ReadonlyArray<Pick<CharacterPublic, 'id' | 'isAlive'>>;
  caseTruth: Pick<CaseTruth, 'summary' | 'testimonies'>;
  interrogations: ReadonlyArray<InterrogationAction>;
  trials: ReadonlyArray<TrialDecision>;
};

export type CalculateScoreResult = {
  breakdown: ScoreBreakdown;
  rank: ScoreRank;
};

/**
 * A4-04: スコア評価 (純関数)。
 *
 * 各 breakdown 項目を集計し、複合条件でランクを決定する。
 * - S: 完全裁判 (人狼処刑 / 誤処刑 0 / 信頼 ≥ 80)
 * - A: 人狼処刑 + 軽微なミス (誤処刑 ≤ 1, 信頼 ≥ 60)
 * - B: 人狼処刑 + それ以外
 * - C: 人狼未処刑 + 多数犠牲 (生存村人 ≤ 2 でも狼が存命)
 * - D: 冤罪 + 信頼崩壊 (status === lost_trust_collapsed)
 */
export function calculateScore(args: CalculateScoreArgs): CalculateScoreResult {
  const breakdown = buildBreakdown(args);
  const rank = decideRank(breakdown, args.meta.status);
  return { breakdown, rank };
}

function buildBreakdown(args: CalculateScoreArgs): ScoreBreakdown {
  const werewolfId = args.caseTruth.summary.werewolfId;

  const executedTrials = args.trials.filter((t) => t.verdict === 'execute');
  const werewolfIdentified = executedTrials.some((t) => t.suspectId === werewolfId);

  const wrongExecutions = executedTrials.filter((t) => t.suspectId !== werewolfId).length;

  const survivingVillagers = args.characters.filter((c) => c.isAlive && c.id !== werewolfId).length;

  const usedPoints = args.interrogations.reduce((sum, i) => sum + i.cost, 0);
  // 1 ポイントあたりに得た「有意な情報」の指標 (lie/誤解 を引いた net)
  const usefulFindings = args.interrogations.filter(
    (i) => i.truthStatus === 'truth' || i.truthStatus === 'omission'
  ).length;
  const interrogationEfficiency =
    usedPoints === 0 ? 0 : Math.round((usefulFindings / usedPoints) * 100) / 100;

  // 矛盾指摘の正誤
  const contradictionsByTestimony = new Map<string, Testimony>();
  for (const t of args.caseTruth.testimonies) contradictionsByTestimony.set(t.id, t);

  let correctContradictions = 0;
  let wrongContradictions = 0;
  for (const ix of args.interrogations) {
    if (ix.questionType !== 'contradiction') continue;
    const presented = ix.presentedContradictionIds ?? [];
    if (presented.length === 0) {
      wrongContradictions++;
      continue;
    }
    const matched = presented.some((id) => {
      const t = contradictionsByTestimony.get(id);
      if (!t) return false;
      return isCorrectContradiction(presented, t);
    });
    if (matched) correctContradictions++;
    else wrongContradictions++;
  }

  return {
    werewolfIdentified,
    daysElapsed: args.meta.currentDay,
    wrongExecutions,
    survivingVillagers,
    interrogationEfficiency,
    correctContradictions,
    wrongContradictions,
    finalVillageTrust: args.meta.villageTrust,
  };
}

function decideRank(breakdown: ScoreBreakdown, status: GameMeta['status']): ScoreRank {
  if (status === 'lost_trust_collapsed') return 'D';

  if (breakdown.werewolfIdentified) {
    if (breakdown.wrongExecutions === 0 && breakdown.finalVillageTrust >= 80) return 'S';
    if (breakdown.wrongExecutions <= 1 && breakdown.finalVillageTrust >= 60) return 'A';
    return 'B';
  }

  // 人狼未処刑
  if (breakdown.survivingVillagers <= 2 || status === 'lost_too_few_villagers') return 'C';
  return 'C';
}
