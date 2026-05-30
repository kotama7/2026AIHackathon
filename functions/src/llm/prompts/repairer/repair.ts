/**
 * A2-10: Repairer プロンプト。
 * Validator の指摘を受けて CaseTruth を最小修正。差分 (JSON Patch) を返させる。
 */
import type { CaseTruth, ValidationIssue } from '@village/shared';

export type BuildRepairPromptArgs = {
  truth: CaseTruth;
  issues: ValidationIssue[];
};

export function buildRepairPrompt(_args: BuildRepairPromptArgs): string {
  // TODO(A2-10): プロンプト本文を実装
  return '';
}
