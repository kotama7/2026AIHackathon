import type { EvidenceId, Testimony, TestimonyId } from '@village/shared';

/**
 * プレイヤーが提示した証拠 / 証言群が、対象の証言の {@link Testimony.contradictedBy} を
 * カバーしているか判定する。1 件でも含まれていれば「正しい矛盾指摘」とみなす。
 *
 * 要件 §10.10 / A3-04 の「正しい矛盾指摘 → 信頼度 +」のトリガー判定に使う。
 */
export function isCorrectContradiction(
  presentedIds: ReadonlyArray<EvidenceId | TestimonyId>,
  testimony: Pick<Testimony, 'contradictedBy'>
): boolean {
  if (presentedIds.length === 0) return false;
  const breakers = new Set<string>(testimony.contradictedBy);
  return presentedIds.some((id) => breakers.has(id));
}
