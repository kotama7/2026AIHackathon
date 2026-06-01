'use client';

import type {
  AdvancePhaseRequest,
  AdvancePhaseResponse,
  AdvanceToTrialRequest,
  AdvanceToTrialResponse,
  CharacterPublic,
  GamePhase,
  DialogueLog,
  EvidencePublic,
  GameMeta,
  RevealTruthRequest,
  RevealTruthResponse,
  StartNewGameRequest,
  StartNewGameResponse,
  SubmitInterrogationRequest,
  SubmitInterrogationResponse,
  SubmitNightActionRequest,
  SubmitNightActionResponse,
  SubmitTrialDecisionRequest,
  SubmitTrialDecisionResponse,
} from '@village/shared';

/* ===== モックレイテンシ ===== */
const LATENCY_MS = 500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (label: string, payload?: unknown) =>
  // eslint-disable-next-line no-console
  console.info(`[MOCK] ${label}`, payload ?? '');

/* ===== fixture helpers ===== */

function makeTimestamp(date: Date = new Date()) {
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
  };
}

const CHARS: CharacterPublic[] = [
  {
    id: 'char_001',
    name: 'ミナ',
    publicPersonality: '冷静で論理的',
    speakingStyle: '簡潔で断定的',
    socialRole: '村長',
    isAlive: true,
    trustToPlayer: 60,
  },
  {
    id: 'char_002',
    name: 'ケンジ',
    publicPersonality: '陽気でおしゃべり',
    speakingStyle: '冗談を交える',
    socialRole: '鍛冶屋',
    isAlive: true,
    trustToPlayer: 70,
  },
  {
    id: 'char_003',
    name: 'リエ',
    publicPersonality: '物静かで観察眼が鋭い',
    speakingStyle: '控えめだが鋭い',
    socialRole: '薬師',
    isAlive: true,
    trustToPlayer: 50,
  },
  {
    id: 'char_004',
    name: 'タカシ',
    publicPersonality: '頑固で実直',
    speakingStyle: 'ぶっきらぼう',
    socialRole: '農夫',
    isAlive: true,
    trustToPlayer: 65,
  },
  {
    id: 'char_005',
    name: 'アヤ',
    publicPersonality: '優しく面倒見が良い',
    speakingStyle: '丁寧',
    socialRole: '宿屋の女将',
    isAlive: true,
    trustToPlayer: 75,
  },
  {
    id: 'char_006',
    name: 'ジロウ',
    publicPersonality: '神経質で猜疑心が強い',
    speakingStyle: '早口',
    socialRole: '門番',
    isAlive: true,
    trustToPlayer: 55,
  },
];

// 真の人狼は char_003 (リエ) — モックゲームでの固定真相
const WEREWOLF_ID = 'char_003';

const DAY1_EVIDENCE: EvidencePublic[] = [
  {
    id: 'ev_001',
    day: 1,
    name: '時計塔の足跡',
    description: '時計塔の階段に、雨でぬかるんだ靴跡が一組だけ残っていた。',
    reliability: 'A',
    relatedCharacters: [],
  },
  {
    id: 'ev_002',
    day: 1,
    name: '被害者の手帳',
    description: '被害者ケイタの手帳に、「リエに相談する」とのメモ。',
    reliability: 'B',
    relatedCharacters: ['char_003'],
  },
  {
    id: 'ev_003',
    day: 1,
    name: '夜の物音証言',
    description: 'アヤが「23:50頃、誰かが廊下を走るのを聞いた」と証言。',
    reliability: 'C',
    relatedCharacters: [],
  },
];

const DAY1_LOGS: DialogueLog[] = [
  {
    id: 'log_001',
    day: 1,
    phase: 'morning',
    turn: 1,
    speakerId: 'char_001',
    text: '昨夜、ケイタが時計塔で死体で発見された。私たちの中に人狼がいる可能性が高い。',
    intent: 'observation',
    confidence: 0.9,
    emotion: 'tense',
    createdAt: makeTimestamp(),
  },
  {
    id: 'log_002',
    day: 1,
    phase: 'discussion',
    turn: 2,
    speakerId: 'char_002',
    text: '昨夜は宿で飲んでいて、誰とも会ってない。ケイタが時計塔へ行く理由がわからん。',
    intent: 'evasive',
    confidence: 0.7,
    emotion: 'calm',
    createdAt: makeTimestamp(),
  },
  {
    id: 'log_003',
    day: 1,
    phase: 'discussion',
    turn: 3,
    speakerId: 'char_003',
    targetId: 'char_006',
    text: 'ジロウ、あなたは門番でしょう。昨夜、誰が時計塔へ向かったか見ていないの？',
    intent: 'question',
    confidence: 0.8,
    emotion: 'calm',
    createdAt: makeTimestamp(),
  },
];

function makeMeta(gameId: string, uid = 'mock_uid'): GameMeta {
  const now = makeTimestamp();
  return {
    gameId,
    uid,
    currentDay: 1,
    currentPhase: 'discussion',
    remainingPoints: 5,
    aliveCharacters: CHARS.map((c) => c.id),
    villageTrust: 80,
    status: 'in_progress',
    isSeedGame: true,
    createdAt: now,
    updatedAt: now,
  };
}

function findChar(id: string): CharacterPublic {
  const c = CHARS.find((x) => x.id === id);
  if (!c) throw new Error(`mock: character not found: ${id}`);
  return c;
}

/* ===== Mock implementations ===== */

const MOCK_PHASE_ORDER: GamePhase[] = [
  'morning',
  'discussion',
  'investigation',
  'organize',
  'trial',
  'night',
  'result',
];
let mockPhase: GamePhase = 'morning';

export async function mockAdvancePhase(req: AdvancePhaseRequest): Promise<AdvancePhaseResponse> {
  log('advancePhase', req);
  await sleep(LATENCY_MS);
  const i = MOCK_PHASE_ORDER.indexOf(mockPhase);
  mockPhase = MOCK_PHASE_ORDER[Math.min(i + 1, MOCK_PHASE_ORDER.length - 1)]!;
  const meta: GameMeta = { ...makeMeta(req.gameId), currentPhase: mockPhase };
  return { meta, phase: mockPhase };
}

export async function mockStartNewGame(
  req: StartNewGameRequest,
): Promise<StartNewGameResponse> {
  log('startNewGame', req);
  await sleep(LATENCY_MS);
  const gameId = `mock_${Date.now().toString(36)}`;
  return {
    gameId,
    meta: makeMeta(gameId),
    characters: CHARS,
    initialEvidence: DAY1_EVIDENCE,
    initialLogs: DAY1_LOGS,
  };
}

export async function mockSubmitInterrogation(
  req: SubmitInterrogationRequest,
): Promise<SubmitInterrogationResponse> {
  log('submitInterrogation', req);
  await sleep(LATENCY_MS);
  const target = findChar(req.targetId);
  const isWerewolf = target.id === WEREWOLF_ID;
  const answers: Record<string, string> = {
    normal: '昨夜のことは…あまりよく覚えていないわ。',
    deep_dive: '23時頃まで起きていたけれど、その後は寝ました。誰とも会っていません。',
    evidence: 'その足跡が私のものだと言いたいの？冗談はやめて。',
    contradiction:
      '矛盾ですって…？確かに言いましたけど、勘違いだったかもしれません。',
    forced:
      '…わかったわ。実は、ケイタとは少し言い争いがあったの。でも私が殺したわけじゃない！',
  };
  const cost: Record<string, number> = {
    normal: 1,
    deep_dive: 2,
    evidence: 1,
    contradiction: 2,
    forced: 3,
  };
  const trustDelta = isWerewolf ? -8 : -3;
  return {
    interrogationId: `mock_int_${Date.now().toString(36)}`,
    answer: answers[req.questionType] ?? '…黙秘します。',
    trustDelta,
    remainingPoints: Math.max(0, 5 - (cost[req.questionType] ?? 1)),
    updatedCharacter: {
      ...target,
      trustToPlayer: Math.max(0, target.trustToPlayer + trustDelta),
    },
  };
}

export async function mockAdvanceToTrial(
  req: AdvanceToTrialRequest,
): Promise<AdvanceToTrialResponse> {
  log('advanceToTrial', req);
  await sleep(LATENCY_MS);
  return {
    candidates: CHARS.filter((c) => c.isAlive),
    maxEvidence: 3,
    maxContradictions: 2,
  };
}

export async function mockSubmitTrialDecision(
  req: SubmitTrialDecisionRequest,
): Promise<SubmitTrialDecisionResponse> {
  log('submitTrialDecision', req);
  await sleep(LATENCY_MS);
  const isWerewolf = req.suspectId === WEREWOLF_ID;
  const suspect = findChar(req.suspectId);
  const defense = isWerewolf
    ? `…ばれちゃったわね。ええ、私が人狼よ。だけど、私には私の理由があったの。`
    : `私は無実です！どうか信じてください。`;
  return {
    defense,
    reactions: CHARS.filter((c) => c.id !== req.suspectId)
      .slice(0, 3)
      .map((c) => ({
        characterId: c.id,
        text: isWerewolf
          ? `${suspect.name}が…そんな。`
          : `本当に${suspect.name}が犯人なのか？`,
        stance: (isWerewolf ? 'support' : 'oppose') as
          | 'support'
          | 'oppose'
          | 'neutral',
      })),
    wasCorrect: req.verdict === 'execute' ? isWerewolf : undefined,
    outcome: req.verdict === 'execute' ? (isWerewolf ? 'won' : 'lost') : 'continue',
    finalStatus:
      req.verdict === 'execute'
        ? isWerewolf
          ? 'won'
          : 'lost_too_few_villagers'
        : undefined,
  };
}

export async function mockSubmitNightAction(
  req: SubmitNightActionRequest,
): Promise<SubmitNightActionResponse> {
  log('submitNightAction', req);
  await sleep(LATENCY_MS);
  const watching = findChar(req.watchTargetId);
  const sawWerewolf = req.watchTargetId === WEREWOLF_ID;
  const isLastDay = req.day === 3;
  return {
    watchResult: sawWerewolf
      ? `${watching.name}が深夜に部屋を抜け出し、北の森へ向かうのが見えた。`
      : `${watching.name}はずっと自室にいたようだ。`,
    nextDayEvidence: [],
    nextDayLogs: [],
    gameOver: isLastDay,
    finalStatus: isLastDay ? 'lost_werewolf_survived' : undefined,
  };
}

export async function mockRevealTruth(
  req: RevealTruthRequest,
): Promise<RevealTruthResponse> {
  log('revealTruth', req);
  await sleep(LATENCY_MS);
  const werewolf = findChar(WEREWOLF_ID);
  return {
    werewolf,
    truthSummary:
      '人狼はリエだった。彼女はケイタが自分の過去 (薬師の禁忌) を知ってしまったため、口封じのため時計塔へ呼び出し襲撃した。',
    characterReveals: CHARS.map((c) => ({
      character: c,
      secret: c.id === WEREWOLF_ID ? '人狼として10年前にこの村に潜入した' : '通常の村人',
      privateGoal: c.id === WEREWOLF_ID ? '正体を隠し続けたい' : '平穏な暮らしを守る',
      fear: c.id === WEREWOLF_ID ? '禁忌が露見すること' : '次は自分が被害者になること',
    })),
    lieReveals: [
      {
        speakerId: WEREWOLF_ID,
        content: '昨夜は自室にいました',
        reason: '時計塔への襲撃を隠すため',
        hiddenTruth: '23:50に時計塔へ移動し、ケイタを襲撃した',
      },
    ],
    evidenceReveals: DAY1_EVIDENCE.map((e) => ({
      evidence: e,
      trueInterpretation:
        e.id === 'ev_001'
          ? '時計塔の足跡はリエのもの。雨で他の住民は外出を避けていた'
          : '関連情報',
    })),
    deductionPath: [
      {
        step: 1,
        reasoning: '被害時刻に時計塔へ到達できた人物は限られる',
        requiredEvidence: ['ev_001'],
        requiredTestimonies: [],
        excludedSuspects: ['char_002', 'char_005'],
        playerHadAllEvidence: true,
        playerHadAllTestimonies: true,
      },
    ],
    score: {
      werewolfIdentified: true,
      daysElapsed: 2,
      wrongExecutions: 0,
      survivingVillagers: 5,
      interrogationEfficiency: 0.8,
      correctContradictions: 1,
      wrongContradictions: 0,
      finalVillageTrust: 78,
    },
    rank: 'A',
  };
}
