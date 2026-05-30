import type {
  CaseTruth,
  CharacterId,
  CharacterPublic,
  GameMeta,
  GameStatus,
} from '@village/shared';
import { LOSE_THRESHOLDS, MAX_DAYS } from '@village/shared';

/**
 * 勝敗判定のトリガー (要件 §10.11)
 * - 'trial_execute': 裁判で execute 確定後 (人狼か村人かは context 側で判定)
 * - 'night_end':     夜→翌朝への遷移時 (Day n → n+1)
 * - 'day_end':       Day 終了タイミング (夜行動なしフロー用、現状未使用だが将来用)
 *
 * 注: 「裁判で人狼処刑」は judgmentContext で渡し、即時 'won' を返す。
 */
export type EvaluateTrigger = 'trial_execute' | 'night_end' | 'day_end';

export type EvaluateInput = {
  trigger: EvaluateTrigger;
  meta: Pick<GameMeta, 'currentDay' | 'villageTrust' | 'aliveCharacters'>;
  characters: ReadonlyArray<Pick<CharacterPublic, 'id' | 'isAlive'>>;
  caseTruth: Pick<CaseTruth, 'summary'>;
  /** trigger === 'trial_execute' のときに必須 */
  executedCharacterId?: CharacterId;
};

export type EvaluateResult = {
  status: GameStatus;
  /** どの条件で確定したか (ログ用) */
  reason: string;
};

/**
 * 純関数版の勝敗判定。Firestore 更新は呼び出し側で行う (A3-09 や A4-05)。
 *
 * 優先順位:
 * 1. trigger === 'trial_execute' で執行したのが人狼  → won
 * 2. 信頼度崩壊 (villageTrust < MIN_VILLAGE_TRUST)   → lost_trust_collapsed
 * 3. 生存村人 ≤ MIN_ALIVE_VILLAGERS                   → lost_too_few_villagers
 * 4. trigger === 'night_end' で Day が MAX_DAYS 超え  → lost_werewolf_survived
 * 5. その他                                            → in_progress
 */
export function evaluateGameStatus(input: EvaluateInput): EvaluateResult {
  const { trigger, meta, characters, caseTruth, executedCharacterId } = input;
  const werewolfId = caseTruth.summary.werewolfId;

  // 1. 裁判で execute → 人狼当たれば即勝利、それ以外は他条件を見る
  if (trigger === 'trial_execute') {
    if (executedCharacterId && executedCharacterId === werewolfId) {
      return { status: 'won', reason: 'werewolf_executed' };
    }
  }

  // 2. 信頼度崩壊
  if (meta.villageTrust < LOSE_THRESHOLDS.MIN_VILLAGE_TRUST) {
    return { status: 'lost_trust_collapsed', reason: 'village_trust_below_threshold' };
  }

  // 3. 生存村人 (人狼以外の生存数)
  const aliveVillagers = characters.filter((c) => c.isAlive && c.id !== werewolfId).length;
  if (aliveVillagers <= LOSE_THRESHOLDS.MIN_ALIVE_VILLAGERS) {
    return { status: 'lost_too_few_villagers', reason: 'alive_villagers_below_threshold' };
  }

  // 4. Day n=MAX 終了で狼生存
  if (trigger === 'night_end' && meta.currentDay >= MAX_DAYS) {
    const werewolfAlive = characters.some((c) => c.id === werewolfId && c.isAlive);
    if (werewolfAlive) {
      return { status: 'lost_werewolf_survived', reason: 'max_days_reached_with_werewolf_alive' };
    }
  }

  return { status: 'in_progress', reason: 'no_terminal_condition' };
}
