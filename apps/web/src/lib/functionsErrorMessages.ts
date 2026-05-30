import type { FunctionErrorCode } from '@village/shared';

import { FunctionsApiError } from '@/lib/firebase/functions';

const MESSAGES: Record<FunctionErrorCode, { user: string; canRetry: boolean }> = {
  unauthenticated: {
    user: 'サインイン情報が見つかりません。ページを再読み込みしてください。',
    canRetry: false,
  },
  permission_denied: {
    user: 'このゲームへのアクセス権がありません。',
    canRetry: false,
  },
  game_not_found: {
    user: 'ゲームが見つかりません。タイトルから新規に始めてください。',
    canRetry: false,
  },
  invalid_phase: {
    user: '現在のフェーズではこのアクションを実行できません。',
    canRetry: false,
  },
  insufficient_points: {
    user: '尋問ポイントが足りません。',
    canRetry: false,
  },
  target_not_alive: {
    user: 'この対象は脱落しているため操作できません。',
    canRetry: false,
  },
  evidence_not_found: {
    user: '指定した証拠が見つかりませんでした。',
    canRetry: false,
  },
  too_many_evidence: {
    user: '一度に提示できる証拠の上限を超えています。',
    canRetry: false,
  },
  too_many_contradictions: {
    user: '一度に提示できる矛盾の上限を超えています。',
    canRetry: false,
  },
  llm_failure: {
    user: 'AI 生成に失敗しました。もう一度試してみてください。',
    canRetry: true,
  },
  truth_compiler_failure: {
    user: '事件の構築に失敗しました。シードゲームに切り替えるかリトライしてください。',
    canRetry: true,
  },
  schema_validation_failure: {
    user: '受信データに不整合がありました。リトライまたはサポートに報告してください。',
    canRetry: true,
  },
  internal_error: {
    user: '予期せぬエラーが発生しました。',
    canRetry: true,
  },
};

export function describeError(err: unknown): { user: string; canRetry: boolean } {
  if (err instanceof FunctionsApiError) {
    return MESSAGES[err.code] ?? MESSAGES.internal_error;
  }
  if (err instanceof Error && err.message) {
    return { user: err.message, canRetry: true };
  }
  return { user: '予期せぬエラーが発生しました。', canRetry: true };
}
