/**
 * LLM 呼び出し関連のエラー階層。
 * すべて GeminiError を継承し、callable では HttpsError('internal', ...) にラップする。
 */
export class GeminiError extends Error {
  public override readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'GeminiError';
    this.cause = cause;
  }
}

/** 30 秒タイムアウト超過 */
export class GeminiTimeoutError extends GeminiError {
  constructor(timeoutMs: number) {
    super(`Gemini request timed out after ${timeoutMs}ms`);
    this.name = 'GeminiTimeoutError';
  }
}

/** 429/5xx を最大リトライ回数まで試して失敗 */
export class GeminiRetryExhaustedError extends GeminiError {
  constructor(attempts: number, cause?: unknown) {
    super(`Gemini request failed after ${attempts} attempts`, cause);
    this.name = 'GeminiRetryExhaustedError';
  }
}

/** GEMINI_API_KEY が未設定 */
export class GeminiConfigError extends GeminiError {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiConfigError';
  }
}

/** アプリ側の 1 日あたりリクエスト上限に到達 (多層防御。無料枠超過前に自前で停止) */
export class GeminiQuotaError extends GeminiError {
  constructor(public readonly dailyLimit: number) {
    super(`LLM daily request limit reached (${dailyLimit}). Try again tomorrow.`);
    this.name = 'GeminiQuotaError';
  }
}

/** zod スキーマ検証で最大リトライまで失敗 (A1-02) */
export class LLMSchemaError extends GeminiError {
  constructor(
    public readonly issues: Array<{ path: string; message: string }>,
    public readonly lastRawOutput: string
  ) {
    super(
      `LLM output failed schema validation: ${issues.map((i) => `${i.path}: ${i.message}`).join('; ')}`
    );
    this.name = 'LLMSchemaError';
  }
}
