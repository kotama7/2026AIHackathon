import type {
  CharacterPublic,
  DialogueLog,
  EvidencePublic,
  GameId,
  GameMeta,
  UserId,
} from '@village/shared';
import { INITIAL_INTERROGATION_POINTS } from '@village/shared';

import { nowTimestamp } from '../db/admin.js';

/**
 * A1-05 のスタブが書き込むダミーデータ。
 * A2-12 で Truth Compiler 実装に差し替える際にこのファイルごと削除する想定。
 *
 * 注意: secret / private_goal などの内部情報は CaseTruth に置く設計。
 * このファイルは PublicCharacter (UI 表示用) のみを生成する。
 */

const CHARACTER_FIXTURES: Omit<CharacterPublic, 'isAlive' | 'trustToPlayer'>[] = [
  {
    id: 'char_mina',
    name: 'ミナ',
    publicPersonality: '冷静で論理的、観察眼が鋭い',
    speakingStyle: '簡潔で断定的',
    socialRole: '時計塔の管理人',
    accentColor: '#5B8DB8',
  },
  {
    id: 'char_kenji',
    name: 'ケンジ',
    publicPersonality: '人懐っこく好奇心旺盛、噂話に敏感',
    speakingStyle: 'やや早口で饒舌',
    socialRole: '宿屋の若主人',
    accentColor: '#C8A24B',
  },
  {
    id: 'char_ayame',
    name: 'アヤメ',
    publicPersonality: '物静かで内省的、言葉を選ぶ',
    speakingStyle: '丁寧でゆっくり',
    socialRole: '図書室の司書',
    accentColor: '#9B7BC8',
  },
  {
    id: 'char_takeshi',
    name: 'タケシ',
    publicPersonality: '実直で頑固、規律を重んじる',
    speakingStyle: '武骨で短い',
    socialRole: '元兵士の鍛冶屋',
    accentColor: '#7A6F5E',
  },
  {
    id: 'char_yuri',
    name: 'ユリ',
    publicPersonality: '快活で社交的、人の感情に敏感',
    speakingStyle: '明るく親しげ',
    socialRole: '医師見習い',
    accentColor: '#C85B7A',
  },
  {
    id: 'char_sora',
    name: 'ソラ',
    publicPersonality: '皮肉屋で疑い深い、口数は少ない',
    speakingStyle: '低く抑揚なく',
    socialRole: '渡り商人',
    accentColor: '#5E7A6F',
  },
];

const EVIDENCE_FIXTURES: Omit<EvidencePublic, 'id'>[] = [
  {
    day: 1,
    name: '深夜の扉ログ',
    description: '時計塔の管理小屋の扉が 23:52 に内側から開いた記録がある。',
    reliability: 'B',
    relatedCharacters: ['char_mina'],
  },
  {
    day: 1,
    name: '泥のついた靴跡',
    description: '時計塔の階段に北側からの新しい泥跡。雨は夜半過ぎに上がっていた。',
    reliability: 'A',
    relatedCharacters: ['char_takeshi', 'char_sora'],
  },
  {
    day: 1,
    name: '破れた手紙の断片',
    description: '「…今夜、いつもの場所で」とだけ読める紙片が現場近くで見つかった。',
    reliability: 'C',
    relatedCharacters: ['char_kenji', 'char_yuri'],
  },
];

const LOG_FIXTURES: Array<
  Pick<DialogueLog, 'turn' | 'speakerId' | 'text' | 'intent' | 'confidence' | 'emotion'>
> = [
  {
    turn: 0,
    speakerId: 'char_kenji',
    text: '聞いたか? 時計塔で誰か倒れていたって。こんな静かな村で…',
    intent: 'observation',
    confidence: 0.6,
    emotion: 'tense',
  },
  {
    turn: 1,
    speakerId: 'char_mina',
    text: '事実だけ確認したい。時刻は 0 時前後、場所は北側階段の踊り場。',
    intent: 'observation',
    confidence: 0.9,
    emotion: 'calm',
  },
  {
    turn: 2,
    speakerId: 'char_takeshi',
    text: '夜中に北の方角から物音がした気がする。が、確証はない。',
    intent: 'observation',
    confidence: 0.5,
    emotion: 'calm',
  },
  {
    turn: 3,
    speakerId: 'char_sora',
    text: '誰かが嘘をついている。この村の誰かが、だ。',
    intent: 'suspicion',
    confidence: 0.7,
    emotion: 'tense',
  },
  {
    turn: 4,
    speakerId: 'char_ayame',
    text: '…私からは、まだ何も言えません。混乱しています。',
    intent: 'evasive',
    confidence: 0.3,
    emotion: 'fearful',
  },
];

// =============================================================================
// builders
// =============================================================================

export function buildDummyCharacters(): CharacterPublic[] {
  return CHARACTER_FIXTURES.map((c) => ({ ...c, isAlive: true, trustToPlayer: 50 }));
}

export function buildDummyEvidence(gameId: GameId): EvidencePublic[] {
  return EVIDENCE_FIXTURES.map((e, i) => ({
    ...e,
    id: `${gameId}_ev${(i + 1).toString().padStart(2, '0')}`,
  }));
}

export function buildDummyLogs(gameId: GameId): DialogueLog[] {
  const now = nowTimestamp();
  return LOG_FIXTURES.map((l, i) => ({
    id: `${gameId}_log${(i + 1).toString().padStart(2, '0')}`,
    day: 1,
    phase: 'discussion',
    turn: l.turn,
    speakerId: l.speakerId,
    text: l.text,
    intent: l.intent,
    confidence: l.confidence,
    emotion: l.emotion,
    createdAt: now,
  }));
}

export function buildInitialMeta(uid: UserId, gameId: GameId): GameMeta {
  const now = nowTimestamp();
  return {
    gameId,
    uid,
    currentDay: 1,
    currentPhase: 'discussion',
    remainingPoints: INITIAL_INTERROGATION_POINTS,
    aliveCharacters: CHARACTER_FIXTURES.map((c) => c.id),
    villageTrust: 50,
    status: 'in_progress',
    isSeedGame: false,
    createdAt: now,
    updatedAt: now,
  };
}
