import { describe, expect, it, jest } from '@jest/globals';
import { z } from 'zod';

import { LLMSchemaError } from '../src/llm/errors.js';

/**
 * geminiClient を mock して、generateStructured の動作 (成功 / リトライ / 失敗) を確認。
 * 実際の Gemini API は叩かない。
 */
jest.unstable_mockModule('../src/llm/geminiClient.js', () => ({
  TEMPERATURE: { GENERATOR: 0.9, VALIDATOR: 0.2, SPEAKER: 0.7 },
  callGemini: jest.fn(),
}));

const { callGemini } = await import('../src/llm/geminiClient.js');
const { generateStructured } = await import('../src/llm/validateAndRetry.js');
const mockedCallGemini = callGemini as jest.MockedFunction<typeof callGemini>;

const schema = z.object({
  greeting: z.string().min(1),
  count: z.number().int(),
});

describe('generateStructured', () => {
  beforeEach(() => {
    mockedCallGemini.mockReset();
  });

  it('1 回目で valid JSON が返れば成功', async () => {
    mockedCallGemini.mockResolvedValueOnce({
      text: '{"greeting": "hi", "count": 3}',
      durationMs: 100,
      attempts: 1,
    });
    const result = await generateStructured({ prompt: 'test', schema });
    expect(result.data).toEqual({ greeting: 'hi', count: 3 });
    expect(result.schemaAttempts).toBe(1);
    expect(mockedCallGemini).toHaveBeenCalledTimes(1);
  });

  it('1 回目失敗 → 2 回目成功', async () => {
    mockedCallGemini
      .mockResolvedValueOnce({
        text: '{"greeting": "", "count": 1}', // greeting 空 → invalid
        durationMs: 100,
        attempts: 1,
      })
      .mockResolvedValueOnce({
        text: '{"greeting": "hello", "count": 2}',
        durationMs: 100,
        attempts: 1,
      });
    const result = await generateStructured({ prompt: 'test', schema, maxAttempts: 3 });
    expect(result.data.greeting).toBe('hello');
    expect(result.schemaAttempts).toBe(2);
    expect(mockedCallGemini).toHaveBeenCalledTimes(2);
    // 2 回目のプロンプトには「失敗理由」が含まれる
    const secondCallArg = mockedCallGemini.mock.calls[1]?.[0]?.prompt as string;
    expect(secondCallArg).toContain('スキーマ検証に失敗');
  });

  it('```json フェンス付きでも parse できる', async () => {
    mockedCallGemini.mockResolvedValueOnce({
      text: '```json\n{"greeting": "fenced", "count": 5}\n```',
      durationMs: 50,
      attempts: 1,
    });
    const result = await generateStructured({ prompt: 'test', schema });
    expect(result.data.greeting).toBe('fenced');
  });

  it('3 連続失敗で LLMSchemaError を throw', async () => {
    mockedCallGemini.mockResolvedValue({
      text: 'not json at all',
      durationMs: 50,
      attempts: 1,
    });
    await expect(
      generateStructured({ prompt: 'test', schema, maxAttempts: 3 })
    ).rejects.toBeInstanceOf(LLMSchemaError);
    expect(mockedCallGemini).toHaveBeenCalledTimes(3);
  });

  it('LLMSchemaError は最後の raw output を保持する', async () => {
    mockedCallGemini.mockResolvedValue({
      text: '{"bad": 1}',
      durationMs: 50,
      attempts: 1,
    });
    try {
      await generateStructured({ prompt: 'test', schema, maxAttempts: 2 });
      throw new Error('should not reach');
    } catch (e) {
      expect(e).toBeInstanceOf(LLMSchemaError);
      expect((e as LLMSchemaError).lastRawOutput).toBe('{"bad": 1}');
      expect((e as LLMSchemaError).issues.length).toBeGreaterThan(0);
    }
  });
});
