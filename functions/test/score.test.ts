import { describe, expect, it } from '@jest/globals';
import type {
  CaseTruth,
  CharacterPublic,
  FirebaseTimestamp,
  GameMeta,
  InterrogationAction,
  Testimony,
  TrialDecision,
} from '@village/shared';

import { calculateScore, type CalculateScoreArgs } from '../src/gameLoop/score.js';

// =============================================================================
// fixtures
// =============================================================================

const ts: FirebaseTimestamp = {
  toDate: () => new Date(0),
  toMillis: () => 0,
  seconds: 0,
  nanoseconds: 0,
};

const wolfId = 'w';

const baseTestimonies: Pick<Testimony, 'id' | 'contradictedBy'>[] = [
  { id: 't_wolf_lie_1', contradictedBy: ['e_alibi_door', 't_witness_1'] },
  { id: 't_wolf_lie_2', contradictedBy: ['e_footprint'] },
];

const baseCaseTruth: Pick<CaseTruth, 'summary' | 'testimonies'> = {
  summary: {
    werewolfId: wolfId,
    victimId: 'victim',
    attackTime: '23:00',
    attackLocation: 'square',
    solutionLogic: 'dummy',
  },
  testimonies: baseTestimonies as Testimony[],
};

const baseCharacters: Pick<CharacterPublic, 'id' | 'isAlive'>[] = [
  { id: wolfId, isAlive: false },
  { id: 'v1', isAlive: true },
  { id: 'v2', isAlive: true },
  { id: 'v3', isAlive: true },
  { id: 'v4', isAlive: true },
  { id: 'v5', isAlive: true },
];

function makeMeta(
  overrides: Partial<GameMeta> = {}
): Pick<GameMeta, 'currentDay' | 'villageTrust' | 'status'> {
  return {
    currentDay: 2,
    villageTrust: 85,
    status: 'won',
    ...overrides,
  };
}

function makeTrial(overrides: Partial<TrialDecision> = {}): TrialDecision {
  return {
    day: 1,
    suspectId: wolfId,
    presentedEvidence: [],
    presentedContradictions: [],
    verdict: 'execute',
    wasCorrect: true,
    defenseText: '',
    reactions: [],
    createdAt: ts,
    ...overrides,
  };
}

function makeInterrogation(overrides: Partial<InterrogationAction> = {}): InterrogationAction {
  return {
    id: 'ix',
    day: 1,
    targetId: 'v1',
    questionType: 'normal',
    questionText: '',
    cost: 1,
    answerText: '',
    truthStatus: 'truth',
    trustDelta: 0,
    createdAt: ts,
    ...overrides,
  };
}

function args(overrides: Partial<CalculateScoreArgs> = {}): CalculateScoreArgs {
  return {
    meta: makeMeta(),
    characters: baseCharacters,
    caseTruth: baseCaseTruth,
    interrogations: [],
    trials: [makeTrial()],
    ...overrides,
  };
}

// =============================================================================
// tests
// =============================================================================

describe('calculateScore - breakdown', () => {
  it('人狼処刑された場合 werewolfIdentified=true', () => {
    const { breakdown } = calculateScore(args());
    expect(breakdown.werewolfIdentified).toBe(true);
    expect(breakdown.wrongExecutions).toBe(0);
    expect(breakdown.survivingVillagers).toBe(5);
  });

  it('村人を誤処刑した trial をカウント', () => {
    const trials = [makeTrial({ suspectId: 'v1', wasCorrect: false })];
    const { breakdown } = calculateScore(args({ trials }));
    expect(breakdown.werewolfIdentified).toBe(false);
    expect(breakdown.wrongExecutions).toBe(1);
  });

  it('interrogationEfficiency = useful / used cost', () => {
    const interrogations = [
      makeInterrogation({ cost: 1, truthStatus: 'truth' }),
      makeInterrogation({ cost: 2, truthStatus: 'lie' }),
      makeInterrogation({ cost: 1, truthStatus: 'omission' }),
    ];
    const { breakdown } = calculateScore(args({ interrogations }));
    // useful = 2 (truth + omission), used = 4 → 0.5
    expect(breakdown.interrogationEfficiency).toBe(0.5);
  });

  it('contradiction 質問の正誤集計', () => {
    const interrogations = [
      makeInterrogation({
        questionType: 'contradiction',
        presentedContradictionIds: ['t_wolf_lie_1', 'e_alibi_door'],
      }),
      makeInterrogation({
        questionType: 'contradiction',
        presentedContradictionIds: ['e_unrelated'],
      }),
    ];
    const { breakdown } = calculateScore(args({ interrogations }));
    expect(breakdown.correctContradictions).toBe(1);
    expect(breakdown.wrongContradictions).toBe(1);
  });
});

describe('calculateScore - rank', () => {
  it('S: 人狼処刑 + 誤処刑 0 + 信頼 ≥ 80', () => {
    expect(calculateScore(args()).rank).toBe('S');
  });

  it('A: 人狼処刑 + 誤処刑 ≤ 1 + 信頼 ≥ 60', () => {
    const trials = [
      makeTrial({ day: 1, suspectId: 'v1', wasCorrect: false }),
      makeTrial({ day: 2 }),
    ];
    const result = calculateScore(args({ meta: makeMeta({ villageTrust: 65 }), trials }));
    expect(result.rank).toBe('A');
  });

  it('B: 人狼処刑 + その他', () => {
    const trials = [
      makeTrial({ day: 1, suspectId: 'v1', wasCorrect: false }),
      makeTrial({ day: 2 }),
    ];
    const result = calculateScore(args({ meta: makeMeta({ villageTrust: 30 }), trials }));
    expect(result.rank).toBe('B');
  });

  it('C: 人狼未処刑', () => {
    const result = calculateScore(
      args({
        meta: makeMeta({ status: 'lost_werewolf_survived', villageTrust: 50 }),
        trials: [],
      })
    );
    expect(result.rank).toBe('C');
  });

  it('D: 信頼崩壊で敗北', () => {
    const result = calculateScore(
      args({ meta: makeMeta({ status: 'lost_trust_collapsed', villageTrust: 10 }), trials: [] })
    );
    expect(result.rank).toBe('D');
  });
});
