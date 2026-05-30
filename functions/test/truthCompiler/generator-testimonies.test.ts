import { describe, expect, it, jest } from '@jest/globals';
import type { Character, Evidence, TimelineEvent } from '@village/shared';
import { schemas } from '@village/shared';

import { makeValidCaseTruth } from '../fixtures/caseTruth.js';

/**
 * A2-05: generateTestimonies。generateStructured を mock し、
 * id 採番 / knownFactsUsed 交差 / 件数検証 / メトリクス通知を確認する。
 */
jest.unstable_mockModule('../../src/llm/validateAndRetry.js', () => ({
  generateStructured: jest.fn(),
}));

const { generateStructured } = await import('../../src/llm/validateAndRetry.js');
const { generateTestimonies } = await import('../../src/truthCompiler/generator/testimonies.js');
const mocked = generateStructured as jest.MockedFunction<typeof generateStructured>;

type LeanTestimony = {
  day: number;
  speakerId: string;
  text: string;
  truthStatus: 'truth' | 'lie' | 'misunderstanding' | 'omission' | 'uncertainty';
  lieReason?: string;
  contradictedBy: string[];
  knownFactsUsed: string[];
};

const SUSPECT_IDS = ['char_1', 'char_2', 'char_3', 'char_4', 'char_5', 'char_6'] as const;

function makeCharacters(): Character[] {
  // 各容疑者に knownFacts: ['time_1'] を与える。
  // フィクスチャの 1 人目を雛形に id/name/knownFacts だけ差し替える。
  const base = makeValidCaseTruth().characters[0]!;
  return SUSPECT_IDS.map((id, i) => ({
    ...structuredClone(base),
    id,
    name: `話者${i + 1}`,
    knownFacts: ['time_1'],
  }));
}

function makeEvidence(): Evidence[] {
  return makeValidCaseTruth().evidence;
}

function makeTimeline(): TimelineEvent[] {
  return makeValidCaseTruth().timeline;
}

/** 各容疑者 2 件 (= 12 件) の lean 証言を作る。char_3 の 1 件は崩せる嘘。 */
function makeLeanTestimonies(): LeanTestimony[] {
  const out: LeanTestimony[] = [];
  for (const id of SUSPECT_IDS) {
    out.push({
      day: 1,
      speakerId: id,
      text: `${id} の真実の証言`,
      truthStatus: 'truth',
      contradictedBy: [],
      knownFactsUsed: ['time_1'],
    });
    if (id === 'char_3') {
      // 確定証拠で崩せる嘘 (lieReason + 非空 contradictedBy)。
      out.push({
        day: 2,
        speakerId: id,
        text: '私は一晩中、自室にいました。',
        truthStatus: 'lie',
        lieReason: '時計塔への移動と襲撃を隠すため',
        contradictedBy: ['ev_c1', 'ev_c2'],
        knownFactsUsed: ['time_1'],
      });
    } else {
      out.push({
        day: 2,
        speakerId: id,
        text: `${id} の 2 件目の証言`,
        truthStatus: 'truth',
        contradictedBy: [],
        knownFactsUsed: ['time_1'],
      });
    }
  }
  return out;
}

function mockResolveWith(testimonies: LeanTestimony[]): void {
  mocked.mockResolvedValueOnce({
    data: { testimonies },
    raw: JSON.stringify({ testimonies }),
    geminiAttempts: 1,
    schemaAttempts: 1,
    durationMs: 200,
    inputTokens: 500,
    outputTokens: 400,
  } as never);
}

function skeleton() {
  const truth = makeValidCaseTruth();
  return {
    werewolfId: truth.summary.werewolfId,
    victimId: 'victim_1' as const,
    attackTime: truth.summary.attackTime,
    attackLocation: truth.summary.attackLocation,
    attackRoute: 'ロビーを経由して時計塔へ',
    primaryEvidenceTypes: ['door_log', 'footprint'],
    redHerringCharacterId: 'char_5',
    redHerringReason: '中庭での密会を隠すため怪しく見える',
    solutionLogic: truth.summary.solutionLogic,
    locationGraph: truth.locationGraph,
  };
}

describe('generateTestimonies', () => {
  beforeEach(() => mocked.mockReset());

  it('Testimony[] (12 件以上) を返し共有スキーマを通過する', async () => {
    mockResolveWith(makeLeanTestimonies());
    const testimonies = await generateTestimonies(
      skeleton(),
      makeCharacters(),
      makeTimeline(),
      makeEvidence()
    );
    expect(testimonies.length).toBeGreaterThanOrEqual(12);
    expect(schemas.testimonySchema.array().safeParse(testimonies).success).toBe(true);
  });

  it('id を t1.. と順番に採番する', async () => {
    mockResolveWith(makeLeanTestimonies());
    const testimonies = await generateTestimonies(
      skeleton(),
      makeCharacters(),
      makeTimeline(),
      makeEvidence()
    );
    expect(testimonies[0]!.id).toBe('t1');
    expect(testimonies[1]!.id).toBe('t2');
    expect(testimonies.map((t) => t.id)).toEqual(testimonies.map((_, i) => `t${i + 1}`));
  });

  it('すべての嘘に lieReason と非空の contradictedBy がある', async () => {
    mockResolveWith(makeLeanTestimonies());
    const testimonies = await generateTestimonies(
      skeleton(),
      makeCharacters(),
      makeTimeline(),
      makeEvidence()
    );
    const lies = testimonies.filter((t) => t.truthStatus === 'lie');
    expect(lies.length).toBeGreaterThanOrEqual(1);
    for (const lie of lies) {
      expect(lie.lieReason).toBeTruthy();
      expect(lie.contradictedBy.length).toBeGreaterThan(0);
    }
  });

  it('knownFactsUsed を話者の knownFacts と交差させ、範囲外 id を落とす', async () => {
    const lean = makeLeanTestimonies();
    // 1 件目の knownFactsUsed に範囲外 id (time_999) を混ぜる。
    lean[0]!.knownFactsUsed = ['time_1', 'time_999'];
    mockResolveWith(lean);
    const testimonies = await generateTestimonies(
      skeleton(),
      makeCharacters(),
      makeTimeline(),
      makeEvidence()
    );
    // time_999 は char_1 の knownFacts (['time_1']) に無いので落ちる。
    expect(testimonies[0]!.knownFactsUsed).toEqual(['time_1']);
    for (const t of testimonies) {
      for (const id of t.knownFactsUsed) {
        expect(id).toBe('time_1');
      }
    }
  });

  it('opts.collect に stage:testimonies のメトリクスを通知する', async () => {
    mockResolveWith(makeLeanTestimonies());
    const collected: unknown[] = [];
    await generateTestimonies(skeleton(), makeCharacters(), makeTimeline(), makeEvidence(), {
      collect: (m) => collected.push(m),
    });
    expect(collected).toHaveLength(1);
    expect(collected[0]).toMatchObject({ stage: 'testimonies', durationMs: 200 });
  });

  it('証言が 12 件未満なら明確なエラーを投げる', async () => {
    mockResolveWith(makeLeanTestimonies().slice(0, 8));
    await expect(
      generateTestimonies(skeleton(), makeCharacters(), makeTimeline(), makeEvidence())
    ).rejects.toThrow(/不足/);
  });
});
