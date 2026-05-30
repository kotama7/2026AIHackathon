/**
 * A2-11 補助: 3 つの Validator を「軽い順 → 重い順」で実行し結果を統合する。
 * 順序は deducibility (純) → logic (純) → motivation (純 + 任意で LLM judge)。
 */
import type { CaseTruth, ValidationIssue, ValidationResult } from '@village/shared';

import { validateDeducibility } from './deducibility.js';
import { validateLogic } from './logic.js';
import { validateMotivation } from './motivation.js';

export type ValidateAllOptions = {
  /** motivation で LLM judge を回すか (重い)。compile の最終確認以外では false 推奨。 */
  useLlm?: boolean;
  model?: string;
};

export async function validateAll(
  truth: CaseTruth,
  opts: ValidateAllOptions = {}
): Promise<ValidationResult> {
  const startedAt = Date.now();

  const deducibility = validateDeducibility(truth);
  const logic = validateLogic(truth);
  const motivation = await validateMotivation(truth, opts);

  const issues: ValidationIssue[] = [...deducibility.issues, ...logic.issues, ...motivation.issues];
  const passed = issues.every((i) => i.severity !== 'error');

  return {
    passed,
    issues,
    ...(deducibility.scores ? { scores: deducibility.scores } : {}),
    durationMs: Date.now() - startedAt,
  };
}
