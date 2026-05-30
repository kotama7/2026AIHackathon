import { describe, expect, it } from '@jest/globals';

import {
  GeminiConfigError,
  GeminiError,
  GeminiRetryExhaustedError,
  GeminiTimeoutError,
  LLMSchemaError,
} from '../src/llm/errors.js';

describe('LLM error classes', () => {
  it('GeminiError は cause を保持する', () => {
    const cause = new Error('inner');
    const err = new GeminiError('outer', cause);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(GeminiError);
    expect(err.name).toBe('GeminiError');
    expect(err.cause).toBe(cause);
  });

  it('GeminiTimeoutError はタイムアウト ms をメッセージに含む', () => {
    const err = new GeminiTimeoutError(30000);
    expect(err).toBeInstanceOf(GeminiError);
    expect(err.message).toContain('30000');
    expect(err.name).toBe('GeminiTimeoutError');
  });

  it('GeminiRetryExhaustedError は試行回数をメッセージに含む', () => {
    const inner = new Error('boom');
    const err = new GeminiRetryExhaustedError(4, inner);
    expect(err.message).toContain('4');
    expect(err.cause).toBe(inner);
  });

  it('GeminiConfigError は GeminiError を継承する', () => {
    const err = new GeminiConfigError('missing key');
    expect(err).toBeInstanceOf(GeminiError);
    expect(err.message).toBe('missing key');
  });

  it('LLMSchemaError は issues と lastRawOutput を保持する', () => {
    const err = new LLMSchemaError(
      [
        { path: 'utterance', message: 'too short' },
        { path: 'confidence', message: 'out of range' },
      ],
      '{"bad": true}'
    );
    expect(err.issues).toHaveLength(2);
    expect(err.lastRawOutput).toBe('{"bad": true}');
    expect(err.message).toContain('utterance');
    expect(err.message).toContain('confidence');
  });
});
