/**
 * A2-07: 特定可能性検証 (要件 §6.7, §7.1)。
 *
 * 純ロジック (LLM 不使用)。各容疑者のスコアを集計し、人狼が一意に特定可能で
 * かつレッドヘリングと適切な差がつく真相になっているかを検証する。
 *
 * スコア = Σ(その容疑者を pointsTo に含む証拠の weight)。
 * 容疑者は char_1..char_6 の 6 人。被害者 (victim) は集計対象外。
 */
import type { CaseTruth, ValidationIssue, ValidationResult } from '@village/shared';
import { DEDUCIBILITY_THRESHOLDS } from '@village/shared';

import { characterIds } from '../types.js';

/**
 * 各容疑者 (char_1..char_6) のスコアを計算する。
 * スコア = その容疑者を pointsTo に含むすべての証拠の weight 合計。
 * 被害者は容疑者集合に含めないため除外される。
 */
export function computeSuspectScores(truth: CaseTruth): Record<string, number> {
  const suspects = characterIds(truth.characters.length || 6);
  const suspectSet = new Set(suspects);
  const scores: Record<string, number> = {};
  for (const id of suspects) {
    scores[id] = 0;
  }
  for (const ev of truth.evidence) {
    for (const target of ev.pointsTo) {
      if (suspectSet.has(target)) {
        scores[target] = (scores[target] ?? 0) + ev.weight;
      }
    }
  }
  return scores;
}

/**
 * 特定可能性を検証する。失敗した検証項目ごとに deducibility カテゴリの
 * error 級 ValidationIssue を積む。
 */
export function validateDeducibility(truth: CaseTruth): ValidationResult {
  const startedAt = Date.now();
  const issues: ValidationIssue[] = [];

  const {
    WEREWOLF_SCORE_MIN,
    WEREWOLF_SCORE_MAX,
    RED_HERRING_SCORE_MIN,
    RED_HERRING_SCORE_MAX,
    GAP_MIN,
    GAP_MAX,
    REQUIRED_EVIDENCE_FOR_WEREWOLF,
  } = DEDUCIBILITY_THRESHOLDS;

  const suspects = characterIds(truth.characters.length || 6);
  const scores = computeSuspectScores(truth);
  const werewolfId = truth.summary.werewolfId;
  const werewolfScore = scores[werewolfId] ?? 0;

  const nonWerewolf = suspects.filter((id) => id !== werewolfId);
  const nonWerewolfScores = nonWerewolf.map((id) => scores[id] ?? 0);
  const maxNonWerewolfScore = nonWerewolfScores.length > 0 ? Math.max(...nonWerewolfScores) : 0;

  // --- Check 1: 人狼スコアが最大 (他のどの容疑者にも超えられていない) ---
  const exceeders = nonWerewolf.filter((id) => (scores[id] ?? 0) > werewolfScore);
  const tiedAtTop = nonWerewolf.filter((id) => (scores[id] ?? 0) === werewolfScore);
  if (exceeders.length > 0) {
    issues.push({
      category: 'deducibility',
      severity: 'error',
      message: `人狼 (${werewolfId}, スコア ${werewolfScore}) より高いスコアの容疑者が存在します: ${exceeders
        .map((id) => `${id}=${scores[id] ?? 0}`)
        .join(', ')}。人狼が最大スコアでなければ特定できません。`,
      relatedIds: [werewolfId, ...exceeders],
    });
  } else if (tiedAtTop.length > 0) {
    issues.push({
      category: 'deducibility',
      severity: 'error',
      message: `人狼 (${werewolfId}, スコア ${werewolfScore}) と同点で最大の容疑者が存在します: ${tiedAtTop.join(
        ', '
      )}。人狼は単独で最大スコアである必要があります。`,
      relatedIds: [werewolfId, ...tiedAtTop],
    });
  }

  // --- Check 2: 人狼スコアが範囲内 [WEREWOLF_SCORE_MIN, WEREWOLF_SCORE_MAX] ---
  if (werewolfScore < WEREWOLF_SCORE_MIN || werewolfScore > WEREWOLF_SCORE_MAX) {
    issues.push({
      category: 'deducibility',
      severity: 'error',
      message: `人狼 (${werewolfId}) のスコア ${werewolfScore} が範囲外です (期待: ${WEREWOLF_SCORE_MIN}〜${WEREWOLF_SCORE_MAX})。`,
      relatedIds: [werewolfId],
    });
  }

  // --- Check 3: 最大レッドヘリングスコアが範囲内 [RED_HERRING_SCORE_MIN, RED_HERRING_SCORE_MAX] ---
  if (maxNonWerewolfScore < RED_HERRING_SCORE_MIN || maxNonWerewolfScore > RED_HERRING_SCORE_MAX) {
    const topNonWerewolf = nonWerewolf.filter((id) => (scores[id] ?? 0) === maxNonWerewolfScore);
    issues.push({
      category: 'deducibility',
      severity: 'error',
      message: `最大レッドヘリングスコア ${maxNonWerewolfScore} が範囲外です (期待: ${RED_HERRING_SCORE_MIN}〜${RED_HERRING_SCORE_MAX})。`,
      relatedIds: topNonWerewolf,
    });
  }

  // --- Check 4: 差分 gap が範囲内 [GAP_MIN, GAP_MAX] ---
  const gap = werewolfScore - maxNonWerewolfScore;
  if (gap < GAP_MIN || gap > GAP_MAX) {
    issues.push({
      category: 'deducibility',
      severity: 'error',
      message: `人狼スコアと最大レッドヘリングスコアの差 ${gap} が範囲外です (期待: ${GAP_MIN}〜${GAP_MAX})。`,
      relatedIds: [werewolfId],
    });
  }

  // --- Check 5: 人狼を示す証拠数 ≥ REQUIRED_EVIDENCE_FOR_WEREWOLF ---
  const werewolfEvidence = truth.evidence.filter((ev) => ev.pointsTo.includes(werewolfId));
  if (werewolfEvidence.length < REQUIRED_EVIDENCE_FOR_WEREWOLF) {
    issues.push({
      category: 'deducibility',
      severity: 'error',
      message: `人狼 (${werewolfId}) を示す証拠が ${werewolfEvidence.length} 件しかありません (必要: ${REQUIRED_EVIDENCE_FOR_WEREWOLF} 件以上)。`,
      relatedIds: [werewolfId, ...werewolfEvidence.map((ev) => ev.id)],
    });
  }

  // --- Check 6: deduction_path が最後まで接続している ---
  // excludedSuspects の和集合 + finalTarget = 全容疑者、かつ finalTarget === werewolfId、
  // かつ finalTarget はどの excludedSuspects にも含まれない。
  const path = truth.deductionPath;
  const excludedUnion = new Set<string>();
  for (const step of path.steps) {
    for (const id of step.excludedSuspects) {
      excludedUnion.add(id);
    }
  }
  const finalTarget = path.finalTarget;

  if (finalTarget !== werewolfId) {
    issues.push({
      category: 'deducibility',
      severity: 'error',
      message: `deduction_path の finalTarget (${finalTarget}) が人狼 (${werewolfId}) と一致しません。`,
      relatedIds: [finalTarget, werewolfId],
    });
  }

  if (excludedUnion.has(finalTarget)) {
    issues.push({
      category: 'deducibility',
      severity: 'error',
      message: `deduction_path の finalTarget (${finalTarget}) が excludedSuspects に含まれています。除外された容疑者を最終ターゲットにはできません。`,
      relatedIds: [finalTarget],
    });
  }

  const coverage = new Set<string>(excludedUnion);
  coverage.add(finalTarget);
  const missing = suspects.filter((id) => !coverage.has(id));
  if (missing.length > 0) {
    issues.push({
      category: 'deducibility',
      severity: 'error',
      message: `deduction_path が全容疑者を網羅していません。未接続の容疑者: ${missing.join(
        ', '
      )} (excludedSuspects の和集合 + finalTarget が全 ${suspects.length} 人と一致する必要があります)。`,
      relatedIds: missing,
    });
  }

  const durationMs = Date.now() - startedAt;
  const passed = issues.every((i) => i.severity !== 'error');

  return { passed, issues, scores, durationMs };
}
