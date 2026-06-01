import { type GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from 'firebase-functions/v2';

import { GeminiConfigError, GeminiRetryExhaustedError, GeminiTimeoutError } from './errors.js';
import { GEMINI_API_KEY } from './secrets.js';
import { enforceDailyLlmQuota } from './usageGuard.js';

// =============================================================================
// Defaults
// =============================================================================

/** 役割別の推奨 temperature */
export const TEMPERATURE = {
  /** 多様性最大化: 真相案/キャラ生成 */
  GENERATOR: 0.9,
  /** 安定性最大化: LLM judge 検証、JSON 検証 */
  VALIDATOR: 0.2,
  /** 中庸: 議論・尋問・弁明 */
  SPEAKER: 0.7,
} as const;

/**
 * 既定モデル。gemini-2.5-flash-lite は無料枠の RPM が flash より高く、
 * Truth Compiler の多数の連続呼び出しでもレート上限に当たりにくい。
 * (1.5-flash は廃止、2.0-flash は無料枠0、2.5-flash は 5 RPM で枯渇しやすい)
 */
const DEFAULT_MODEL = 'gemini-2.5-flash-lite';

const DEFAULT_TIMEOUT_MS = 30_000;
// 無料枠は per-minute レート制限 (例: 5 RPM)。429 の retryDelay (~16s) を待ち切れるよう
// リトライ回数を多めに。指数バックオフではなくサーバ指定の retryDelay を優先する。
const DEFAULT_MAX_RETRIES = 6;
const DEFAULT_MAX_OUTPUT_TOKENS = 4096;
/** 429 リトライ待機の上限 (per-minute ウィンドウは 60s 程度で回復) */
const MAX_RETRY_DELAY_MS = 65_000;
/** 外部(ローカル)LLM のデフォルトタイムアウト。ローカル推論は遅いことがあるため長め */
const EXTERNAL_TIMEOUT_MS = 120_000;

type ExternalLlm = { baseUrl: string; model?: string; apiKey?: string };

/**
 * 外部 OpenAI 互換 LLM (Ollama / LM Studio / llama.cpp 等) の設定。
 * `LLM_BASE_URL` が設定されていればそれを使い、Gemini は使わない。
 *   LLM_BASE_URL  例: https://<machine>.<tailnet>.ts.net/v1  (Ollama の OpenAI 互換)
 *   LLM_MODEL     例: llama3.1  (未指定なら呼び出し側の model)
 *   LLM_API_KEY   任意 (Bearer)。Ollama は通常不要
 */
function externalLlmConfig(): ExternalLlm | null {
  const baseUrl = process.env.LLM_BASE_URL?.trim();
  if (!baseUrl) return null;
  const model = process.env.LLM_MODEL?.trim();
  const apiKey = process.env.LLM_API_KEY?.trim();
  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    ...(model ? { model } : {}),
    ...(apiKey ? { apiKey } : {}),
  };
}

/** OpenAI 互換 /chat/completions を叩いてテキストを得る。 */
async function callOpenAICompatible(args: {
  baseUrl: string;
  model: string;
  apiKey?: string;
  prompt: string;
  temperature: number;
  maxOutputTokens: number;
  jsonMode: boolean;
}): Promise<{ text: string; inputTokens?: number; outputTokens?: number }> {
  const res = await fetch(`${args.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(args.apiKey ? { authorization: `Bearer ${args.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: args.model,
      messages: [{ role: 'user', content: args.prompt }],
      temperature: args.temperature,
      max_tokens: args.maxOutputTokens,
      stream: false,
      ...(args.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const e = new Error(`[LLM ${res.status}] ${body.slice(0, 300)}`) as Error & { status?: number };
    e.status = res.status;
    throw e;
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = data.choices?.[0]?.message?.content ?? '';
  const out: { text: string; inputTokens?: number; outputTokens?: number } = { text };
  if (typeof data.usage?.prompt_tokens === 'number') out.inputTokens = data.usage.prompt_tokens;
  if (typeof data.usage?.completion_tokens === 'number')
    out.outputTokens = data.usage.completion_tokens;
  return out;
}

// =============================================================================
// Client cache
// =============================================================================

let cachedClient: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (cachedClient) return cachedClient;

  // Secret Manager 経由 (本番) または .secret.local / process.env (emulator)
  let apiKey: string;
  try {
    apiKey = GEMINI_API_KEY.value();
  } catch {
    apiKey = process.env.GEMINI_API_KEY ?? '';
  }

  if (!apiKey) {
    throw new GeminiConfigError(
      'GEMINI_API_KEY が未設定。Secret Manager (firebase functions:secrets:set GEMINI_API_KEY) または functions/.secret.local に設定してください'
    );
  }

  cachedClient = new GoogleGenerativeAI(apiKey);
  return cachedClient;
}

/** テスト用: クライアントキャッシュをリセット */
export function resetGeminiClient(): void {
  cachedClient = null;
}

// =============================================================================
// callGemini
// =============================================================================

export type CallGeminiOptions = {
  /** LLM に送るプロンプト本文 */
  prompt: string;
  /** モデル名。未指定なら gemini-2.5-flash */
  model?: string;
  /** 0.0 - 1.0。未指定なら 0.7 */
  temperature?: number;
  /** 出力トークン上限。未指定なら 4096 */
  maxOutputTokens?: number;
  /** true で responseMimeType を application/json に設定。A1-02 から使う */
  jsonMode?: boolean;
  /** タイムアウト ms。未指定なら 30000 */
  timeoutMs?: number;
  /** 最大リトライ回数 (429/5xx)。未指定なら 3 */
  maxRetries?: number;
  /** ログのトレース用ラベル */
  traceLabel?: string;
};

export type CallGeminiResult = {
  text: string;
  /** 実消費の input/output トークン数 (取れる場合) */
  inputTokens?: number;
  outputTokens?: number;
  /** 開始から終了までの経過 ms (リトライ含む) */
  durationMs: number;
  /** 実際に試行した回数 */
  attempts: number;
};

/**
 * Gemini を呼び出して text を返す共通ラッパー。
 *
 * - 429 はサーバ指定 retryDelay を待つ / 5xx は指数バックオフ。最大 maxRetries 回リトライ
 * - timeoutMs 超過で GeminiTimeoutError
 * - JSON 出力モード (jsonMode=true) で responseMimeType を設定し精度向上
 */
export async function callGemini(opts: CallGeminiOptions): Promise<CallGeminiResult> {
  const {
    prompt,
    model: modelName = DEFAULT_MODEL,
    temperature = TEMPERATURE.SPEAKER,
    maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS,
    jsonMode = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRetries = DEFAULT_MAX_RETRIES,
    traceLabel = 'gemini',
  } = opts;

  // 多層防御: 1 日あたりリクエスト上限 (LLM_DAILY_REQUEST_LIMIT 未設定なら no-op)
  await enforceDailyLlmQuota();

  // 外部 (ローカル) LLM が設定されていれば Gemini の代わりにそれを使う。
  // その場合 Gemini クライアント (GEMINI_API_KEY) は初期化しない。
  const external = externalLlmConfig();
  const model: GenerativeModel | null = external
    ? null
    : getClient().getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature,
          maxOutputTokens,
          ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      });
  // ローカル LLM はネットワーク/推論が遅いことがあるので timeout を延長 (明示指定が無い場合)
  const effectiveTimeout =
    external && timeoutMs === DEFAULT_TIMEOUT_MS ? EXTERNAL_TIMEOUT_MS : timeoutMs;

  const startedAt = Date.now();
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const gen = external
        ? await withTimeout(
            callOpenAICompatible({
              baseUrl: external.baseUrl,
              model: external.model ?? modelName,
              ...(external.apiKey ? { apiKey: external.apiKey } : {}),
              prompt,
              temperature,
              maxOutputTokens,
              jsonMode,
            }),
            effectiveTimeout
          )
        : await withTimeout(
            model!.generateContent(prompt).then(async (r) => ({
              text: r.response.text(),
              ...(await tryGetUsage(model!, prompt)),
            })),
            effectiveTimeout
          );
      const durationMs = Date.now() - startedAt;
      logger.info(`[${traceLabel}] success`, {
        attempt,
        durationMs,
        provider: external ? 'openai-compatible' : 'gemini',
        inputTokens: gen.inputTokens,
        outputTokens: gen.outputTokens,
      });
      return {
        text: gen.text,
        ...(gen.inputTokens !== undefined ? { inputTokens: gen.inputTokens } : {}),
        ...(gen.outputTokens !== undefined ? { outputTokens: gen.outputTokens } : {}),
        durationMs,
        attempts: attempt,
      };
    } catch (err) {
      lastErr = err;
      if (err instanceof GeminiTimeoutError) {
        throw err; // タイムアウトはリトライしない (重い処理を繰り返さないため)
      }
      if (!isRetryable(err) || attempt > maxRetries) {
        logger.error(`[${traceLabel}] non-retryable or exhausted`, { attempt, err: String(err) });
        break;
      }
      // 429 (レート制限) はサーバ指定の retryDelay を優先して待つ。無料枠の per-minute
      // 制限は指数バックオフ (最大4s) では待ち切れないため。指定が無ければ指数バックオフ。
      const serverDelay = extractRetryDelayMs(err);
      const backoff =
        serverDelay != null
          ? Math.min(serverDelay + 1000, MAX_RETRY_DELAY_MS)
          : 1000 * 2 ** (attempt - 1);
      logger.warn(`[${traceLabel}] retry ${attempt} after ${backoff}ms`, { err: String(err) });
      await delay(backoff);
    }
  }

  throw new GeminiRetryExhaustedError(maxRetries + 1, lastErr);
}

// =============================================================================
// helpers
// =============================================================================

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new GeminiTimeoutError(ms)), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

function isRetryable(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  // Google SDK は status を data に乗せる、純 fetch は err.status
  // ネットワーク系 (ECONNRESET, ETIMEDOUT) もリトライ
  const message = String((err as { message?: unknown }).message ?? err);
  if (/ECONNRESET|ETIMEDOUT|ENOTFOUND|socket hang up/i.test(message)) return true;
  // ステータスコードでの判定
  const status = extractStatus(err);
  if (status == null) return false;
  // 429 でも「1日あたり」枠の枯渇は当日回復しないため待っても無駄 → 即失敗させる
  // (retryDelay を待つと 60s×リトライ分ハングし、最終的にタイムアウトするため)。
  if (status === 429 && /PerDay|RequestsPerDay/i.test(message)) return false;
  return status === 429 || (status >= 500 && status < 600);
}

/**
 * 429 エラーからサーバ指定のリトライ待機時間 (ms) を抽出する。
 * Gemini は本文に RetryInfo (`"retryDelay":"18s"`) と
 * 文面 (`Please retry in 18.28s`) の両方を含むので両対応。
 */
function extractRetryDelayMs(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const message =
    typeof (err as { message?: unknown }).message === 'string'
      ? (err as { message: string }).message
      : String(err);
  const retryInfo = message.match(/"retryDelay":\s*"([\d.]+)s"/);
  if (retryInfo && retryInfo[1]) return Math.ceil(Number(retryInfo[1]) * 1000);
  const human = message.match(/retry in ([\d.]+)s/i);
  if (human && human[1]) return Math.ceil(Number(human[1]) * 1000);
  return undefined;
}

function extractStatus(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const e = err as Record<string, unknown>;
  if (typeof e.status === 'number') return e.status;
  if (typeof e.statusCode === 'number') return e.statusCode;
  const message = typeof e.message === 'string' ? e.message : '';
  const m = message.match(/\[(\d{3})\b/);
  return m && m[1] ? Number(m[1]) : undefined;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function tryGetUsage(
  model: GenerativeModel,
  prompt: string
): Promise<{ inputTokens?: number; outputTokens?: number }> {
  try {
    const c = await model.countTokens(prompt);
    return { inputTokens: c.totalTokens };
  } catch {
    return {};
  }
}
