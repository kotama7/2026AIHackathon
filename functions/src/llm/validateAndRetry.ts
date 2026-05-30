import { logger } from 'firebase-functions/v2';
import type { z } from 'zod';

import { LLMSchemaError } from './errors.js';
import { callGemini, type CallGeminiOptions } from './geminiClient.js';

// =============================================================================
// generateStructured
// =============================================================================

export type GenerateStructuredOptions<T extends z.ZodTypeAny> = Omit<
  CallGeminiOptions,
  'jsonMode'
> & {
  schema: T;
  /** スキーマ検証込みの最大試行回数 (1 = 一度きり、リトライなし)。デフォルト 3。 */
  maxAttempts?: number;
};

export type GenerateStructuredResult<T extends z.ZodTypeAny> = {
  data: z.infer<T>;
  raw: string;
  /** call_gemini が消費した試行回数 (transport リトライは含まれる) */
  geminiAttempts: number;
  /** スキーマ検証の試行回数 */
  schemaAttempts: number;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
};

/**
 * Gemini 出力を zod スキーマで検証し、失敗すれば失敗理由をプロンプトに添えて再生成。
 *
 * Phase 2 以降の Generator / Validator / Speaker から呼ばれる。
 *
 * - 1 回目失敗 → 「先ほどの出力は次の理由で失敗した: ... 修正して JSON のみ出力せよ」
 * - 最大 maxAttempts まで再試行
 * - すべて失敗で LLMSchemaError を throw
 */
export async function generateStructured<T extends z.ZodTypeAny>(
  opts: GenerateStructuredOptions<T>
): Promise<GenerateStructuredResult<T>> {
  const { schema, maxAttempts = 3, traceLabel = 'gemini-structured', ...rest } = opts;

  let lastIssues: Array<{ path: string; message: string }> = [];
  let lastRaw = '';
  let totalGeminiAttempts = 0;
  let totalDurationMs = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const augmentedPrompt =
      attempt === 1 ? rest.prompt : buildRetryPrompt(rest.prompt, lastRaw, lastIssues);

    const result = await callGemini({
      ...rest,
      prompt: augmentedPrompt,
      jsonMode: true,
      traceLabel: `${traceLabel}/attempt-${attempt}`,
    });

    totalGeminiAttempts += result.attempts;
    totalDurationMs += result.durationMs;
    lastRaw = result.text;

    const parsed = tryParseJson(result.text);
    if (!parsed.ok) {
      lastIssues = [{ path: '$', message: `not valid JSON: ${parsed.error}` }];
      logger.warn(`[${traceLabel}] attempt ${attempt} JSON parse failed`, {
        sample: result.text.slice(0, 200),
      });
      continue;
    }

    const safe = schema.safeParse(parsed.value);
    if (safe.success) {
      logger.info(`[${traceLabel}] schema validation passed`, {
        attempt,
        durationMs: totalDurationMs,
      });
      return {
        data: safe.data,
        raw: result.text,
        geminiAttempts: totalGeminiAttempts,
        schemaAttempts: attempt,
        durationMs: totalDurationMs,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      };
    }

    lastIssues = safe.error.issues.slice(0, 5).map((i) => ({
      path: i.path.length ? i.path.join('.') : '$',
      message: i.message,
    }));
    logger.warn(`[${traceLabel}] attempt ${attempt} schema validation failed`, {
      issues: lastIssues,
    });
  }

  throw new LLMSchemaError(lastIssues, lastRaw);
}

// =============================================================================
// helpers
// =============================================================================

/**
 * 失敗時の追加プロンプト。先ほどの出力と失敗理由を提示し、JSON のみで再出力させる。
 */
function buildRetryPrompt(
  originalPrompt: string,
  lastRaw: string,
  issues: Array<{ path: string; message: string }>
): string {
  const issueList = issues.map((i) => `  - ${i.path}: ${i.message}`).join('\n');
  return `${originalPrompt}

---
あなたは先ほど以下の JSON を出力しましたが、スキーマ検証に失敗しました:
\`\`\`
${truncate(lastRaw, 1500)}
\`\`\`

失敗した理由:
${issueList}

これらの問題を修正した正しい JSON のみを出力してください。説明文や前置きは不要です。
`;
}

/**
 * Gemini の出力からテキストを JSON.parse する。
 * - そのまま JSON のケース
 * - \`\`\`json ... \`\`\` のフェンス付きのケース
 * 両方に対応。
 */
function tryParseJson(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const trimmed = text.trim();

  // fenced
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenceMatch && fenceMatch[1] ? fenceMatch[1].trim() : trimmed;

  try {
    return { ok: true, value: JSON.parse(candidate) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max)}…(truncated)`;
}
