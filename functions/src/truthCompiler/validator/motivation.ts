/**
 * A2-09: 思惑整合性検証 (要件 §7.3)。
 *
 * 純ロジック 3 項目 (常時実行・LLM 不使用):
 *   1. 全キャラに非空の privateGoal がある。
 *   2. truthStatus === 'lie' の証言には非空の lieReason がある (スキーマでも担保されるが防御的に再確認)。
 *   3. 村人が人狼の正体を不自然に知っていない。
 *      人狼の襲撃イベント (襲撃場所での人狼自身のイベント) の knownBy / observedBy に
 *      人狼以外の容疑者が含まれていれば NG (襲撃を目撃した村人は人狼を自明に特定できてしまう)。
 *
 * 任意の LLM judge (opts.useLlm === true のときのみ):
 *   4. 各キャラの行動が personality / private_goal / fear と矛盾しないかを軽量 LLM で一括判定。
 *      "no" (consistent === false) は warning として積む (過剰 reject を避けるため error にはしない)。
 *
 * passed = error 級 issue が 1 件もないこと (warning は失敗扱いしない)。
 */
import type { CaseTruth, ValidationIssue, ValidationResult } from '@village/shared';
import { z } from 'zod';

import { TEMPERATURE } from '../../llm/geminiClient.js';
import {
  buildMotivationJudgePrompt,
  type MotivationJudgeCharacter,
} from '../../llm/prompts/validator/motivation.js';
import { generateStructured } from '../../llm/validateAndRetry.js';

const motivationJudgeSchema = z.object({
  verdicts: z.array(
    z.object({
      characterId: z.string(),
      consistent: z.boolean(),
      reason: z.string(),
    })
  ),
});

/**
 * 純ロジックのみ (検査 1〜3) を同期実行する。
 * Compiler / テストが LLM なしで呼べるように分離している。
 */
export function validateMotivationPure(truth: CaseTruth): ValidationResult {
  const startedAt = Date.now();
  const issues: ValidationIssue[] = [];

  // --- Check 1: 全キャラに非空の privateGoal ---
  for (const c of truth.characters) {
    if (!c.privateGoal || c.privateGoal.trim() === '') {
      issues.push({
        category: 'motivation',
        severity: 'error',
        message: `キャラクター ${c.id} (${c.name}) に privateGoal がありません。全キャラに個人的な目的が必要です。`,
        relatedIds: [c.id],
      });
    }
  }

  // --- Check 2: lie 証言には非空の lieReason ---
  for (const t of truth.testimonies) {
    if (t.truthStatus === 'lie' && (!t.lieReason || t.lieReason.trim() === '')) {
      issues.push({
        category: 'motivation',
        severity: 'error',
        message: `嘘の証言 ${t.id} (発話者 ${t.speakerId}) に lieReason がありません。すべての嘘には理由が必要です。`,
        relatedIds: [t.id, t.speakerId],
      });
    }
  }

  // --- Check 3: 村人が人狼の襲撃を目撃 (= 正体を自明に知る) していない ---
  const werewolfId = truth.summary.werewolfId;
  const attackLocation = truth.summary.attackLocation;
  const attackEvents = truth.timeline.filter(
    (e) => e.character === werewolfId && e.location === attackLocation
  );
  for (const ev of attackEvents) {
    const witnesses = new Set<string>([...ev.knownBy, ...ev.observedBy]);
    for (const villagerId of witnesses) {
      if (villagerId !== werewolfId) {
        issues.push({
          category: 'motivation',
          severity: 'error',
          message: `村人 ${villagerId} が人狼 (${werewolfId}) の襲撃イベント ${ev.id} を知っています (knownBy/observedBy)。襲撃を目撃した村人は人狼を自明に特定できてしまうため不可です。`,
          relatedIds: [villagerId, ev.id],
        });
      }
    }
  }

  const durationMs = Date.now() - startedAt;
  const passed = issues.every((i) => i.severity !== 'error');
  return { passed, issues, durationMs };
}

/**
 * 思惑整合性検証。常に純ロジック 3 項目を実行し、opts.useLlm のとき軽量 LLM judge も実行する。
 * LLM judge の "no" は warning として積む (error にはしない)。
 */
export async function validateMotivation(
  truth: CaseTruth,
  opts: { useLlm?: boolean; model?: string } = {}
): Promise<ValidationResult> {
  const startedAt = Date.now();
  const pure = validateMotivationPure(truth);
  const issues: ValidationIssue[] = [...pure.issues];

  if (opts.useLlm) {
    const judgeChars: MotivationJudgeCharacter[] = truth.characters.map((c) => ({
      id: c.id,
      name: c.name,
      publicPersonality: c.publicPersonality,
      privateGoal: c.privateGoal,
      fear: c.fear,
      actions: truth.timeline
        .filter((e) => e.character === c.id)
        .map((e) => `${e.time} @${e.location}: ${e.action}`),
    }));

    const prompt = buildMotivationJudgePrompt({ characters: judgeChars });
    const result = await generateStructured({
      prompt,
      schema: motivationJudgeSchema,
      temperature: TEMPERATURE.VALIDATOR,
      ...(opts.model ? { model: opts.model } : {}),
      traceLabel: 'validate/motivation',
    });

    const nameById = new Map(truth.characters.map((c) => [c.id, c.name]));
    for (const verdict of result.data.verdicts) {
      if (!verdict.consistent) {
        const name = nameById.get(verdict.characterId) ?? '?';
        issues.push({
          category: 'motivation',
          severity: 'warning',
          message: `キャラクター ${verdict.characterId} (${name}) の行動が性格/目的/恐れと矛盾している可能性があります: ${verdict.reason}`,
          relatedIds: [verdict.characterId],
        });
      }
    }
  }

  const durationMs = Date.now() - startedAt;
  const passed = issues.every((i) => i.severity !== 'error');
  return { passed, issues, durationMs };
}
