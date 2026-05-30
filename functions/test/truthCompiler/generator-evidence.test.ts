import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { CaseSkeleton, Character, TimelineEvent } from '@village/shared';
import { schemas } from '@village/shared';

import { makeValidCaseTruth } from '../fixtures/caseTruth.js';

/**
 * A2-04: generateEvidence。generateStructured を mock し、id 採番・スキーマ検証・
 * 階層数・sourceTimelineEvent の整合・メトリクス通知を確認する。
 */
jest.unstable_mockModule('../../src/llm/validateAndRetry.js', () => ({
  generateStructured: jest.fn(),
}));

const { generateStructured } = await import('../../src/llm/validateAndRetry.js');
const { generateEvidence } = await import('../../src/truthCompiler/generator/evidence.js');
const mocked = generateStructured as jest.MockedFunction<typeof generateStructured>;

const truth = makeValidCaseTruth();

const skeleton: CaseSkeleton = {
  werewolfId: truth.summary.werewolfId,
  victimId: 'victim_1',
  attackTime: truth.summary.attackTime,
  attackLocation: truth.summary.attackLocation,
  attackRoute: 'ロビーを経由して時計塔へ',
  primaryEvidenceTypes: ['door_log', 'footprint'],
  redHerringCharacterId: 'char_5',
  redHerringReason: '中庭での密会を隠すため怪しく見える',
  solutionLogic: truth.summary.solutionLogic,
  locationGraph: truth.locationGraph,
};

const characters: Character[] = truth.characters;

// 小さなフェイクタイムライン (sourceTimelineEvent はこの中から選ぶ)
const timeline: TimelineEvent[] = [
  {
    id: 't_a',
    time: '23:50',
    character: 'char_3',
    location: 'lobby',
    action: 'ロビーを通って時計塔へ向かう',
    knownBy: ['char_3'],
    observedBy: ['char_1'],
    causesEvidence: [],
  },
  {
    id: 't_b',
    time: '00:05',
    character: 'char_3',
    location: 'clock_tower',
    action: '時計塔に到着する',
    knownBy: ['char_3'],
    observedBy: [],
    causesEvidence: [],
  },
  {
    id: 't_c',
    time: '00:10',
    character: 'char_3',
    location: 'clock_tower',
    action: '被害者を襲撃する',
    knownBy: ['char_3'],
    observedBy: [],
    causesEvidence: [],
  },
  {
    id: 't_d',
    time: '23:55',
    character: 'char_5',
    location: 'courtyard',
    action: '中庭で密会する',
    knownBy: ['char_5'],
    observedBy: ['char_6'],
    causesEvidence: [],
  },
  {
    id: 't_e',
    time: '23:40',
    character: 'char_2',
    location: 'library',
    action: '図書室で本を読む',
    knownBy: ['char_2'],
    observedBy: [],
    causesEvidence: [],
  },
  {
    id: 't_f',
    time: '23:58',
    character: 'char_6',
    location: 'courtyard',
    action: '中庭で char_5 を見かける',
    knownBy: ['char_6'],
    observedBy: ['char_5'],
    causesEvidence: [],
  },
];

// lean な (id 抜きの) 証拠。3 階層をそれぞれ 2 枚以上、source は timeline に実在。
function leanEvidence() {
  return [
    {
      day: 1,
      name: '深夜の扉ログ',
      description: 'ロビーの扉が 23:50 に内側から開いた記録。',
      category: 'confirmatory' as const,
      reliability: 'B' as const,
      relatedCharacters: ['char_3'],
      pointsTo: ['char_3'],
      weight: 3,
      ambiguity: 1,
      trueInterpretation: 'char_3 が時計塔へ向かうためロビーを通過した。',
      sourceTimelineEvent: 't_a',
    },
    {
      day: 1,
      name: '時計塔の足跡',
      description: '時計塔の階段に新しい泥跡。',
      category: 'confirmatory' as const,
      reliability: 'A' as const,
      relatedCharacters: ['char_3'],
      pointsTo: ['char_3'],
      weight: 3,
      ambiguity: 1,
      trueInterpretation: 'char_3 が時計塔に到達した。',
      sourceTimelineEvent: 't_b',
    },
    {
      day: 2,
      name: '争った痕跡',
      description: '時計塔の床にもみ合いの跡と布の切れ端。',
      category: 'supporting' as const,
      reliability: 'B' as const,
      relatedCharacters: ['char_3'],
      pointsTo: ['char_3'],
      weight: 2,
      ambiguity: 1,
      trueInterpretation: '襲撃が時計塔で起きたことを補強する。',
      sourceTimelineEvent: 't_c',
    },
    {
      day: 2,
      name: '中庭の足跡',
      description: '中庭に複数人が立ち止まった跡。',
      category: 'supporting' as const,
      reliability: 'C' as const,
      relatedCharacters: ['char_5'],
      pointsTo: ['char_5'],
      weight: 2,
      ambiguity: 2,
      trueInterpretation: 'char_5 が中庭で密会していた (事件と無関係)。',
      sourceTimelineEvent: 't_d',
    },
    {
      day: 3,
      name: '図書室の灯り',
      description: '深夜に図書室の灯りがついていた。',
      category: 'noise' as const,
      reliability: 'C' as const,
      relatedCharacters: ['char_2'],
      pointsTo: ['char_2'],
      weight: 1,
      ambiguity: 2,
      trueInterpretation: 'char_2 が読書していただけ。',
      sourceTimelineEvent: 't_e',
    },
    {
      day: 3,
      name: '破れた紙片',
      description: '「いつもの場所で」とだけ読める紙片。',
      category: 'noise' as const,
      reliability: 'C' as const,
      relatedCharacters: ['char_5'],
      pointsTo: ['char_5'],
      weight: 1,
      ambiguity: 3,
      trueInterpretation: 'char_5 の密会の約束。事件と無関係。',
      sourceTimelineEvent: 't_f',
    },
  ];
}

function mockOnce(durationMs = 200) {
  const data = { evidence: leanEvidence() };
  mocked.mockResolvedValueOnce({
    data,
    raw: JSON.stringify(data),
    geminiAttempts: 1,
    schemaAttempts: 1,
    durationMs,
    inputTokens: 400,
    outputTokens: 600,
  });
}

describe('generateEvidence', () => {
  beforeEach(() => mocked.mockReset());

  it('Evidence[] を返し共有スキーマを通過する', async () => {
    mockOnce();
    const evidence = await generateEvidence(skeleton, timeline, characters);
    expect(Array.isArray(evidence)).toBe(true);
    expect(evidence.length).toBe(6);
    expect(schemas.evidenceSchema.array().safeParse(evidence).success).toBe(true);
  });

  it('id を ev_1.. で採番する', async () => {
    mockOnce();
    const evidence = await generateEvidence(skeleton, timeline, characters);
    expect(evidence.map((e) => e.id)).toEqual(['ev_1', 'ev_2', 'ev_3', 'ev_4', 'ev_5', 'ev_6']);
  });

  it('3 階層をそれぞれ 2 枚以上含む', async () => {
    mockOnce();
    const evidence = await generateEvidence(skeleton, timeline, characters);
    const count = (cat: string) => evidence.filter((e) => e.category === cat).length;
    expect(count('confirmatory')).toBeGreaterThanOrEqual(2);
    expect(count('supporting')).toBeGreaterThanOrEqual(2);
    expect(count('noise')).toBeGreaterThanOrEqual(2);
  });

  it('全 sourceTimelineEvent が入力 timeline に存在する', async () => {
    mockOnce();
    const evidence = await generateEvidence(skeleton, timeline, characters);
    const ids = new Set(timeline.map((e) => e.id));
    for (const e of evidence) {
      expect(ids.has(e.sourceTimelineEvent)).toBe(true);
    }
  });

  it('opts.collect に evidence ステージのメトリクスを通知する', async () => {
    mockOnce(333);
    const collected: unknown[] = [];
    await generateEvidence(skeleton, timeline, characters, { collect: (m) => collected.push(m) });
    expect(collected).toHaveLength(1);
    expect(collected[0]).toMatchObject({ stage: 'evidence', durationMs: 333 });
  });
});
