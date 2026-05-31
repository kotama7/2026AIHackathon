/**
 * P5-07: デモ用シードゲーム (Truth Compiler フォールバック)。
 *
 * `seedCases/*.json` は A2-11 の出力相当の「検証済み CaseTruth」。
 * Truth Compiler が失敗してもプレイ可能なよう、固定の真相をそのまま採用する。
 *
 * すべて読み込み時に caseTruthSchema で再検証し、壊れた seed を早期に弾く。
 */
import type { CaseTruth } from '@village/shared';
import { schemas } from '@village/shared';

import academy from './seedCases/academy.json' with { type: 'json' };
import clocktower from './seedCases/clocktower.json' with { type: 'json' };
import manor from './seedCases/manor.json' with { type: 'json' };

export type SeedCaseId = 'clocktower' | 'manor' | 'academy';

const RAW_SEEDS: Record<SeedCaseId, unknown> = {
  clocktower,
  manor,
  academy,
};

/** 検証済み seed のキャッシュ (モジュール初回ロード時に schema 検証)。 */
const SEED_CASES: Record<SeedCaseId, CaseTruth> = Object.fromEntries(
  Object.entries(RAW_SEEDS).map(([id, raw]) => [id, schemas.caseTruthSchema.parse(raw)])
) as Record<SeedCaseId, CaseTruth>;

export const SEED_CASE_IDS = Object.keys(SEED_CASES) as SeedCaseId[];

/** gameId から決定的に seed を 1 つ選ぶ (テスト再現性のため Math.random は使わない)。 */
function pickSeedId(gameId: string): SeedCaseId {
  let sum = 0;
  for (const ch of gameId) sum += ch.charCodeAt(0);
  return SEED_CASE_IDS[sum % SEED_CASE_IDS.length]!;
}

/**
 * シード CaseTruth を 1 件返す。
 * - seedId 指定時はそれを、未指定なら gameId から決定的に選択。
 * - caseId を gameId に差し替えたディープコピーを返す (元データは不変)。
 */
export function loadSeedCase(gameId: string, seedId?: SeedCaseId): CaseTruth {
  const id = seedId ?? pickSeedId(gameId);
  const base = SEED_CASES[id];
  if (!base) {
    throw new Error(`unknown seed case: ${id}`);
  }
  return { ...structuredClone(base), caseId: gameId };
}
