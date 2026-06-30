/**
 * A2-13: Truth Compiler 連続生成成功率テスト (本物の Gemini を叩く)。
 *
 * 通常の `jest` 実行からは除外され (jest.config.cjs の testPathIgnorePatterns)、
 * `pnpm --filter @village/functions test:e2e:truth-compiler` でのみ走る。
 * GEMINI_API_KEY が無ければ自動 skip。
 *
 * 計測: 成功率 / 平均所要時間 / 1 ゲームあたりトークン消費 を CSV (test/results/) に出力。
 * 閾値: 成功率 70% 以上、平均所要時間 60 秒以内。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from '@jest/globals';

import { compileCaseTruth, TruthCompilerError } from '../../src/truthCompiler/index.js';

const RUNS = Number(process.env.E2E_RUNS ?? 10);
const SUCCESS_RATE_THRESHOLD = 0.7; // 目標 0.8
const AVG_DURATION_MS_THRESHOLD = 60_000;

const hasKey = Boolean(process.env.GEMINI_API_KEY);
const maybe = hasKey ? describe : describe.skip;

type RunRecord = {
  run: number;
  success: boolean;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  repairCount: number;
  regenCount: number;
  error?: string;
};

maybe('Truth Compiler e2e (real Gemini)', () => {
  it(
    `${RUNS} 回連続生成して成功率 ${SUCCESS_RATE_THRESHOLD * 100}% 以上 / 平均 ${AVG_DURATION_MS_THRESHOLD / 1000}s 以内`,
    async () => {
      const records: RunRecord[] = [];

      for (let i = 0; i < RUNS; i++) {
        const startedAt = Date.now();
        try {
          const { metrics } = await compileCaseTruth(
            { caseId: `e2e_${i}`, diversitySeed: `e2e-run-${i}` },
            { useLlm: false, ...(process.env.E2E_MODEL ? { model: process.env.E2E_MODEL } : {}) }
          );
          const tokens = metrics.stages.reduce(
            (acc, s) => ({
              input: acc.input + (s.inputTokens ?? 0),
              output: acc.output + (s.outputTokens ?? 0),
            }),
            { input: 0, output: 0 }
          );
          records.push({
            run: i,
            success: true,
            durationMs: metrics.totalDurationMs,
            inputTokens: tokens.input,
            outputTokens: tokens.output,
            repairCount: metrics.repairCount,
            regenCount: metrics.regenCount,
          });
        } catch (err) {
          records.push({
            run: i,
            success: false,
            durationMs: Date.now() - startedAt,
            inputTokens: 0,
            outputTokens: 0,
            repairCount: err instanceof TruthCompilerError ? -1 : -1,
            regenCount: -1,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      writeCsv(records);

      const successes = records.filter((r) => r.success);
      const successRate = successes.length / RUNS;
      const avgDuration =
        successes.length > 0
          ? successes.reduce((a, r) => a + r.durationMs, 0) / successes.length
          : Infinity;

      // 結果サマリーを stdout にも出す

      console.log(
        `[e2e] success=${successes.length}/${RUNS} (${(successRate * 100).toFixed(0)}%), avg=${(avgDuration / 1000).toFixed(1)}s`
      );

      expect(successRate).toBeGreaterThanOrEqual(SUCCESS_RATE_THRESHOLD);
      expect(avgDuration).toBeLessThanOrEqual(AVG_DURATION_MS_THRESHOLD);
    },
    RUNS * 360_000 + 60_000
  );
});

function writeCsv(records: RunRecord[]): void {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'results');
  mkdirSync(dir, { recursive: true });
  const header = 'run,success,durationMs,inputTokens,outputTokens,repairCount,regenCount,error';
  const lines = records.map((r) =>
    [
      r.run,
      r.success,
      r.durationMs,
      r.inputTokens,
      r.outputTokens,
      r.repairCount,
      r.regenCount,
      r.error ? `"${r.error.replace(/"/g, "'")}"` : '',
    ].join(',')
  );
  const file = join(dir, 'truth-compiler-e2e.csv');
  writeFileSync(file, [header, ...lines].join('\n'), 'utf8');

  console.log(`[e2e] wrote ${file}`);
}
