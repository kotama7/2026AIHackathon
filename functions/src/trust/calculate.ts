import type { CharacterId } from '@village/shared';
import { TRUST_DELTAS } from '@village/shared';

/**
 * 信頼度に影響を与えるプレイヤーアクション。要件 §10.10 / A3-04。
 *
 * - `correct_contradiction`  ... プレイヤーが正しく矛盾を指摘した
 * - `wrong_accusation`       ... 証拠不十分のまま疑いをぶつけた
 * - `force_testimony`        ... 強制証言を行った（圧迫）
 * - `execute_werewolf`       ... 裁判で人狼を処刑できた
 * - `execute_villager`       ... 裁判で村人を誤処刑した
 */
export type TrustAction =
  | { kind: 'correct_contradiction'; targetCharacterId: CharacterId }
  | { kind: 'wrong_accusation'; targetCharacterId: CharacterId }
  | { kind: 'force_testimony'; targetCharacterId: CharacterId }
  | { kind: 'execute_werewolf' }
  | { kind: 'execute_villager' };

export type TrustDeltaResult = {
  /** キャラ ID → 信頼度差分 (クランプ前) */
  characterDeltas: Record<CharacterId, number>;
  /** 村全体の信頼度差分 (クランプ前) */
  villageDelta: number;
};

const EMPTY_CHAR_DELTAS: Record<CharacterId, number> = {};

/**
 * アクションごとの信頼度差分を計算する純関数。
 * クランプ (0-100) は呼び出し側 ({@link ./apply.ts}) で行う。
 */
export function calculateTrustDelta(action: TrustAction): TrustDeltaResult {
  switch (action.kind) {
    case 'correct_contradiction':
      return {
        characterDeltas: {
          [action.targetCharacterId]: TRUST_DELTAS.CORRECT_CONTRADICTION.target,
        },
        villageDelta: TRUST_DELTAS.CORRECT_CONTRADICTION.village,
      };
    case 'wrong_accusation':
      return {
        characterDeltas: {
          [action.targetCharacterId]: TRUST_DELTAS.WRONG_ACCUSATION.target,
        },
        villageDelta: TRUST_DELTAS.WRONG_ACCUSATION.village,
      };
    case 'force_testimony':
      return {
        characterDeltas: {
          [action.targetCharacterId]: TRUST_DELTAS.FORCE_TESTIMONY.target,
        },
        villageDelta: TRUST_DELTAS.FORCE_TESTIMONY.village,
      };
    case 'execute_werewolf':
      return {
        characterDeltas: EMPTY_CHAR_DELTAS,
        villageDelta: TRUST_DELTAS.EXECUTE_WEREWOLF.village,
      };
    case 'execute_villager':
      return {
        characterDeltas: EMPTY_CHAR_DELTAS,
        villageDelta: TRUST_DELTAS.EXECUTE_VILLAGER.village,
      };
  }
}

/** 0-100 にクランプ */
export function clampTrust(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}
