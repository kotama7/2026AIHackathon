/**
 * LLM 生成テキストに漏れた内部ID (char_N / victim_N) を登場人物名へ置換する共通ユーティリティ。
 *
 * 議論・尋問などプレイヤーが読む発話テキストでは、生成 LLM が他者を名前でなく内部ID
 * (例: "char_4さん") で書いてしまうことがある。名簿に従って決定的に置換し、
 * 「謎の人物 char_N」がプレイヤーに見える事故を防ぐ。名簿に無い ID はそのまま残す。
 */

/** characters から id→名前 の Map を作る。 */
export function buildNameById(
  characters: ReadonlyArray<{ id: string; name: string }>
): Map<string, string> {
  return new Map(characters.map((c) => [c.id, c.name]));
}

/** テキスト中の char_N / victim_N を対応する名前へ置換する。 */
export function replaceIdsWithNames(text: string, nameById: Map<string, string>): string {
  return text.replace(/\b(?:char|victim)_\d+\b/g, (id) => nameById.get(id) ?? id);
}
