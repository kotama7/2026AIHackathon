import { describe, expect, it, jest } from '@jest/globals';
import type { CaseSkeleton } from '@village/shared';
import { schemas } from '@village/shared';

import { makeValidCaseTruth } from '../fixtures/caseTruth.js';

/**
 * A2-02: generateCharacters。generateStructured を mock し、組み立てと検証を確認。
 */
jest.unstable_mockModule('../../src/llm/validateAndRetry.js', () => ({
  generateStructured: jest.fn(),
}));

const { generateStructured } = await import('../../src/llm/validateAndRetry.js');
const { generateCharacters } = await import('../../src/truthCompiler/generator/characters.js');
const mocked = generateStructured as jest.MockedFunction<typeof generateStructured>;

function skeletonFrom(truth = makeValidCaseTruth()): CaseSkeleton {
  return {
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
}

/** LLM 出力に相当する lean キャラクター 6 人分。 */
function leanCharacters() {
  const names = ['ミナ', 'ケンジ', 'ソラ', 'タケシ', 'ユリ', 'アヤメ'];
  return names.map((name, i) => ({
    name,
    publicPersonality: '物腰やわらか',
    speakingStyle: '落ち着いた口調',
    socialRole: '村の住人',
    secret: `${name} の秘密`,
    privateGoal: `${name} の目的`,
    fear: `${name} の恐れ`,
    bias: '特になし',
    emotionalState: i === 2 ? 'tense' : 'calm',
    lieTendency: i === 2 ? 85 : 20,
    cooperationLevel: 50,
    liePolicy: {
      willLieAbout: i === 2 ? ['night_location'] : [],
      willNotLieAbout: ['own_role'],
    },
    cooperationPolicy: { cooperateWith: [], conditions: '信頼できる相手には協力する' },
    relationships: [{ withCharacter: 'char_1', label: '友人', affinity: 30 }],
  }));
}

function mockResolveOnce(characters = leanCharacters(), durationMs = 200) {
  const data = { characters };
  mocked.mockResolvedValueOnce({
    data,
    raw: JSON.stringify(data),
    geminiAttempts: 1,
    schemaAttempts: 1,
    durationMs,
    inputTokens: 500,
    outputTokens: 800,
  } as never);
}

describe('generateCharacters', () => {
  beforeEach(() => mocked.mockReset());

  it('6 人の Character[] を返し共有スキーマを通過する', async () => {
    mockResolveOnce();
    const characters = await generateCharacters(skeletonFrom());

    expect(characters).toHaveLength(6);
    expect(schemas.characterSchema.array().safeParse(characters).success).toBe(true);
  });

  it('isWerewolf は skeleton.werewolfId のキャラのみ true、role も整合する', async () => {
    mockResolveOnce();
    const skeleton = skeletonFrom();
    const characters = await generateCharacters(skeleton);

    const werewolves = characters.filter((c) => c.isWerewolf);
    expect(werewolves).toHaveLength(1);
    expect(werewolves[0]?.id).toBe(skeleton.werewolfId);
    expect(werewolves[0]?.role).toBe('werewolf');
    for (const c of characters.filter((x) => !x.isWerewolf)) {
      expect(c.role).toBe('villager');
    }
  });

  it('id は char_1..char_6 で順序通り、knownFacts は全員 []', async () => {
    mockResolveOnce();
    const characters = await generateCharacters(skeletonFrom());

    expect(characters.map((c) => c.id)).toEqual([
      'char_1',
      'char_2',
      'char_3',
      'char_4',
      'char_5',
      'char_6',
    ]);
    for (const c of characters) {
      expect(c.knownFacts).toEqual([]);
    }
  });

  it('名前は重複しない', async () => {
    mockResolveOnce();
    const characters = await generateCharacters(skeletonFrom());
    const names = characters.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('opts.collect に stage:characters のメトリクスを通知する', async () => {
    mockResolveOnce(leanCharacters(), 333);
    const collected: unknown[] = [];
    await generateCharacters(skeletonFrom(), { collect: (m) => collected.push(m) });

    expect(collected).toHaveLength(1);
    expect(collected[0]).toMatchObject({ stage: 'characters', durationMs: 333 });
  });
});
