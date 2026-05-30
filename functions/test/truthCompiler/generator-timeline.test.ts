import { describe, expect, it, jest } from '@jest/globals';
import type { Character } from '@village/shared';
import { schemas } from '@village/shared';

import { makeValidCaseTruth } from '../fixtures/caseTruth.js';

/**
 * A2-03: generateTimeline。generateStructured を mock し、
 * id 採番 / causesEvidence=[] 注入 / 再検証 / メトリクス通知を確認する。
 */
jest.unstable_mockModule('../../src/llm/validateAndRetry.js', () => ({
  generateStructured: jest.fn(),
}));

const { generateStructured } = await import('../../src/llm/validateAndRetry.js');
const { generateTimeline } = await import('../../src/truthCompiler/generator/timeline.js');
const mocked = generateStructured as jest.MockedFunction<typeof generateStructured>;

const VICTIM_ID = 'victim_1';
const ATTACK_TIME = '00:10';
const ATTACK_LOCATION = 'clock_tower';

function skeletonFrom(truth = makeValidCaseTruth()) {
  return {
    werewolfId: truth.summary.werewolfId,
    victimId: VICTIM_ID,
    attackTime: ATTACK_TIME,
    attackLocation: ATTACK_LOCATION,
    attackRoute: 'ロビーを経由して時計塔へ',
    primaryEvidenceTypes: ['door_log', 'footprint'],
    redHerringCharacterId: 'char_5',
    redHerringReason: '中庭での密会を隠すため怪しく見える',
    solutionLogic: truth.summary.solutionLogic,
    locationGraph: truth.locationGraph,
  };
}

/** lean な LLM 出力 (id / causesEvidence を含まない events 配列)。 */
function leanEvents() {
  const events: Array<{
    time: string;
    character: string;
    location: string;
    action: string;
    knownBy: string[];
    observedBy: string[];
  }> = [];

  // 6 容疑者それぞれに 3 イベントずつ (隣接整合は問わずスキーマだけ満たす)。
  for (let n = 1; n <= 6; n++) {
    const id = `char_${n}`;
    events.push(
      {
        time: '23:10',
        character: id,
        location: 'lobby',
        action: '行動1',
        knownBy: [id],
        observedBy: [],
      },
      {
        time: '23:40',
        character: id,
        location: 'lobby',
        action: '行動2',
        knownBy: [id],
        observedBy: [],
      },
      {
        time: '00:30',
        character: id,
        location: 'lobby',
        action: '行動3',
        knownBy: [id],
        observedBy: [],
      }
    );
  }

  // 被害者は襲撃時刻に襲撃場所にいる。
  events.push({
    time: ATTACK_TIME,
    character: VICTIM_ID,
    location: ATTACK_LOCATION,
    action: '襲撃場所で人を待つ',
    knownBy: [VICTIM_ID],
    observedBy: [],
  });

  return events;
}

function mockResolveWith(events = leanEvents()) {
  const data = { events };
  mocked.mockResolvedValueOnce({
    data,
    raw: JSON.stringify(data),
    geminiAttempts: 1,
    schemaAttempts: 1,
    durationMs: 200,
    inputTokens: 400,
    outputTokens: 600,
  });
}

const characters = makeValidCaseTruth().characters as Character[];

describe('generateTimeline', () => {
  beforeEach(() => mocked.mockReset());

  it('TimelineEvent[] を返し共有スキーマを通過する', async () => {
    mockResolveWith();
    const timeline = await generateTimeline(skeletonFrom(), characters);
    expect(Array.isArray(timeline)).toBe(true);
    expect(schemas.timelineEventSchema.array().safeParse(timeline).success).toBe(true);
  });

  it('id を time_1.. で採番し、causesEvidence は常に空配列', async () => {
    mockResolveWith();
    const timeline = await generateTimeline(skeletonFrom(), characters);
    expect(timeline[0]?.id).toBe('time_1');
    expect(timeline[1]?.id).toBe('time_2');
    expect(timeline[timeline.length - 1]?.id).toBe(`time_${timeline.length}`);
    for (const e of timeline) {
      expect(e.causesEvidence).toEqual([]);
    }
  });

  it('全 6 容疑者が最低 3 イベント、被害者が襲撃場所/時刻に登場する', async () => {
    mockResolveWith();
    const timeline = await generateTimeline(skeletonFrom(), characters);
    for (let n = 1; n <= 6; n++) {
      const count = timeline.filter((e) => e.character === `char_${n}`).length;
      expect(count).toBeGreaterThanOrEqual(3);
    }
    const victimEvent = timeline.find((e) => e.character === VICTIM_ID);
    expect(victimEvent).toBeDefined();
    expect(victimEvent?.location).toBe(ATTACK_LOCATION);
    expect(victimEvent?.time).toBe(ATTACK_TIME);
  });

  it('opts.collect に timeline ステージのメトリクスを通知する', async () => {
    mockResolveWith();
    const collected: unknown[] = [];
    await generateTimeline(skeletonFrom(), characters, { collect: (m) => collected.push(m) });
    expect(collected).toHaveLength(1);
    expect(collected[0]).toMatchObject({ stage: 'timeline', durationMs: 200 });
  });
});
