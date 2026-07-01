/**
 * A2-11: Truth Compiler 統合ループ。
 * Generator → Validator → Repairer を制御し、検証合格した CaseTruth を 1 つ返す。
 *
 * ループ (要件 §7.4):
 *   - 1 生成サイクルにつき最大 maxRepairs (既定 3) 回 repair を試みる。
 *   - 直らなければ全体を再生成する。再生成は最大 maxRegens (既定 2) 回 → 計 3 サイクル。
 *   - 全サイクル失敗で TruthCompilerError を throw。
 *   - 各段階の所要時間 / トークン / repair・regen 回数を計測しログに残す。
 */
import type { CaseTruth, ValidationIssue, ValidationResult } from '@village/shared';
import { logger } from 'firebase-functions/v2';

import { generateCaseSkeleton } from './generator/caseSkeleton.js';
import { generateCharacters } from './generator/characters.js';
import { generateDeductionPath } from './generator/deductionPath.js';
import { generateEvidence } from './generator/evidence.js';
import { generateTestimonies } from './generator/testimonies.js';
import { generateTimeline } from './generator/timeline.js';
import { repair } from './repairer.js';
import {
  deriveKnownFacts,
  derivePlannedLies,
  sanitizeAttackWitnesses,
  sanitizeCaseTruthProse,
  wireEvidenceToTimeline,
} from './stitch.js';
import type { CaseDraft, GeneratorOptions, SeedConfig, StageMetrics } from './types.js';
import { validateAll } from './validator/validateAll.js';

export class TruthCompilerError extends Error {
  constructor(
    message: string,
    public readonly cycles: number,
    public readonly lastIssues: ValidationIssue[]
  ) {
    super(message);
    this.name = 'TruthCompilerError';
  }
}

export type CompileOptions = {
  /** 最終確認で motivation の LLM judge を回すか (既定 false: 速度優先) */
  useLlm?: boolean;
  /** 1 サイクルあたりの最大 repair 回数 (既定 3) */
  maxRepairs?: number;
  /** 最大再生成回数 (既定 2 → 初回 + 2 = 計 3 サイクル) */
  maxRegens?: number;
  /** モデル上書き (評価用) */
  model?: string;
};

export type CompileMetrics = {
  stages: StageMetrics[];
  repairCount: number;
  regenCount: number;
  cycles: number;
  totalDurationMs: number;
  finalValidation: ValidationResult;
};

export type CompileResult = {
  caseTruth: CaseTruth;
  metrics: CompileMetrics;
};

export async function compileCaseTruth(
  seed: SeedConfig,
  opts: CompileOptions = {}
): Promise<CompileResult> {
  const maxRepairs = opts.maxRepairs ?? 3;
  // 既定 1 (初回 + 1 = 計 2 サイクル)。全再生成は高コストで、3 サイクル分回すと
  // ローカル/混雑時の LLM 遅延で 900s 関数タイムアウト (deadline-exceeded) に達する。
  // 2 サイクルで収束しなければ truth_compiler_failure を早期に返し UI の seed fallback へ。
  const maxRegens = opts.maxRegens ?? 1;
  const startedAt = Date.now();

  const stages: StageMetrics[] = [];
  const collect = (m: StageMetrics): void => {
    stages.push(m);
  };
  const genOpts: GeneratorOptions = {
    collect,
    ...(opts.model ? { model: opts.model } : {}),
  };
  const validateOpts = {
    useLlm: opts.useLlm ?? false,
    ...(opts.model ? { model: opts.model } : {}),
  };

  let totalRepairCount = 0;
  let regenCount = 0;
  let lastIssues: ValidationIssue[] = [];

  for (let cycle = 0; cycle <= maxRegens; cycle++) {
    if (cycle > 0) {
      regenCount++;
      logger.warn(`[compile] regenerating case (regen ${regenCount}/${maxRegens})`, {
        caseId: seed.caseId,
      });
    }

    let truth: CaseTruth;
    try {
      truth = await generateAssembled(seed, genOpts, cycle);
    } catch (e) {
      // 生成・組み立て自体の失敗 → このサイクルは破棄して再生成へ
      logger.error('[compile] generation failed, will regenerate', {
        cycle,
        err: String(e),
      });
      lastIssues = [
        { category: 'schema', severity: 'error', message: `generation failed: ${String(e)}` },
      ];
      continue;
    }

    let validation = await validateAll(truth, validateOpts);

    let repairCount = 0;
    while (!validation.passed && repairCount < maxRepairs) {
      const errorIssues = validation.issues.filter((i) => i.severity === 'error');
      const result = await repair(truth, errorIssues, genOpts);
      repairCount++;
      totalRepairCount++;
      if (!result.applied) {
        logger.info('[compile] repair could not fix issues, breaking to regenerate', {
          cycle,
          repairCount,
        });
        break;
      }
      truth = result.repaired;
      validation = await validateAll(truth, validateOpts);
    }

    if (validation.passed) {
      // prose に漏れた内部ID (char_N/victim_N) を名前へ置換 (構造化IDは不変なので再検証不要)。
      truth = sanitizeCaseTruthProse(truth);
      truth.validationResult = validation;
      const metrics: CompileMetrics = {
        stages,
        repairCount: totalRepairCount,
        regenCount,
        cycles: cycle + 1,
        totalDurationMs: Date.now() - startedAt,
        finalValidation: validation,
      };
      logger.info('[compile] success', {
        caseId: seed.caseId,
        cycles: metrics.cycles,
        repairCount: metrics.repairCount,
        regenCount: metrics.regenCount,
        totalDurationMs: metrics.totalDurationMs,
      });
      return { caseTruth: truth, metrics };
    }

    lastIssues = validation.issues.filter((i) => i.severity === 'error');
  }

  const cycles = maxRegens + 1;
  logger.error('[compile] exhausted all cycles', { caseId: seed.caseId, cycles, lastIssues });
  throw new TruthCompilerError(
    `Truth Compiler は ${cycles} サイクル (各 ${maxRepairs} repair) すべてで検証に失敗しました`,
    cycles,
    lastIssues
  );
}

/**
 * Generator 群を順に呼び、stitch 関数で縫合して検証前の CaseTruth を組み立てる。
 * cycle を diversitySeed に混ぜ、再生成のたびに別の事件を狙う。
 */
async function generateAssembled(
  seed: SeedConfig,
  genOpts: GeneratorOptions,
  cycle: number
): Promise<CaseTruth> {
  const cycleSeed: SeedConfig = {
    ...seed,
    diversitySeed: `${seed.diversitySeed ?? seed.caseId}#${cycle}`,
  };

  const skeleton = await generateCaseSkeleton(cycleSeed, genOpts);
  let characters = await generateCharacters(skeleton, genOpts);

  const generatedTimeline = await generateTimeline(skeleton, characters, genOpts);
  // 襲撃の目撃者から人狼以外を除去 (motivation Check 3 を常に満たす)。
  // deriveKnownFacts より前に行い、村人の knownFacts/知識範囲の整合を保つ。
  const rawTimeline = sanitizeAttackWitnesses(
    generatedTimeline,
    skeleton.werewolfId,
    skeleton.attackLocation
  );
  // 知識範囲 (knownFacts) をタイムラインから確定
  characters = deriveKnownFacts(characters, rawTimeline);

  const evidence = await generateEvidence(skeleton, rawTimeline, characters, genOpts);
  // 証拠 → タイムラインの causesEvidence を逆向きに埋める
  const timeline = wireEvidenceToTimeline(rawTimeline, evidence);

  const testimonies = await generateTestimonies(skeleton, characters, timeline, evidence, genOpts);
  const plannedLies = derivePlannedLies(characters, testimonies);
  const redHerrings = [
    { characterId: skeleton.redHerringCharacterId, reason: skeleton.redHerringReason },
  ];

  const summary = {
    victimId: skeleton.victimId,
    werewolfId: skeleton.werewolfId,
    attackTime: skeleton.attackTime,
    attackLocation: skeleton.attackLocation,
    solutionLogic: skeleton.solutionLogic,
  };

  const draft: CaseDraft = {
    caseId: seed.caseId,
    summary,
    characters,
    timeline,
    evidence,
    testimonies,
    plannedLies,
    redHerrings,
    locationGraph: skeleton.locationGraph,
  };

  const deductionPath = await generateDeductionPath(draft, genOpts);

  return {
    caseId: seed.caseId,
    summary,
    characters,
    timeline,
    evidence,
    testimonies,
    plannedLies,
    redHerrings,
    deductionPath,
    locationGraph: skeleton.locationGraph,
    validationResult: { passed: false, issues: [] },
  };
}
