/**
 * Truth Compiler の「縫合」純関数群。
 * Generator 間のデータ依存 (知識範囲, 証拠→タイムライン逆参照, 計画された嘘) を
 * LLM ではなくコードで埋める。
 */
import type { Character, Evidence, PlannedLie, Testimony, TimelineEvent } from '@village/shared';

/**
 * 襲撃イベント (人狼が襲撃場所にいるイベント) の目撃者から人狼以外を機械的に除去する。
 *
 * motivation 検証 Check 3 (要件 §7.3): 村人が人狼の襲撃を目撃していると正体が自明にバレて
 * パズルが破綻するため error になる。LLM 生成はここを高頻度で違反し、repair も
 * 配列 index 取り違え等で直せず regen を誘発していた (関数タイムアウトの一因)。
 * これは可解性の本質ではなく機械的制約なので、決定的に除去して常に通す。
 *
 * deriveKnownFacts の「前」に適用すること。そうすれば村人の knownFacts にも襲撃が乗らず、
 * 知識範囲 (knowledgeRange) の整合も保たれる。返り値は新しい配列 (引数は破壊しない)。
 */
export function sanitizeAttackWitnesses(
  timeline: TimelineEvent[],
  werewolfId: string,
  attackLocation: string
): TimelineEvent[] {
  return timeline.map((e) => {
    const isAttackEvent = e.character === werewolfId && e.location === attackLocation;
    if (!isAttackEvent) return e;
    return {
      ...e,
      knownBy: e.knownBy.filter((id) => id === werewolfId),
      observedBy: e.observedBy.filter((id) => id === werewolfId),
    };
  });
}

/**
 * 各キャラクターの knownFacts を、タイムラインから機械的に導出する。
 *
 * 知識範囲の定義 (要件 §7.2 / A2-08):
 *   自分が actor のイベント + observedBy に自分を含むイベント の ID 群。
 *
 * Generator (A2-02) は knownFacts を空で返し、タイムライン生成後にこの関数で確定させる。
 * 返り値は新しい配列 (引数は破壊しない)。
 */
export function deriveKnownFacts(characters: Character[], timeline: TimelineEvent[]): Character[] {
  return characters.map((c) => {
    const known = timeline
      .filter((e) => e.character === c.id || e.observedBy.includes(c.id))
      .map((e) => e.id);
    return { ...c, knownFacts: Array.from(new Set(known)) };
  });
}

/**
 * 証拠の sourceTimelineEvent を元に、タイムライン側の causesEvidence を逆向きに埋める。
 * Generator (A2-03) は causesEvidence を空配列で返し、証拠生成後にこの関数で確定させる。
 * 返り値は新しい配列 (引数は破壊しない)。
 */
export function wireEvidenceToTimeline(
  timeline: TimelineEvent[],
  evidence: Evidence[]
): TimelineEvent[] {
  const byEvent = new Map<string, string[]>();
  for (const ev of evidence) {
    const list = byEvent.get(ev.sourceTimelineEvent) ?? [];
    list.push(ev.id);
    byEvent.set(ev.sourceTimelineEvent, list);
  }
  return timeline.map((e) => ({
    ...e,
    causesEvidence: Array.from(new Set(byEvent.get(e.id) ?? [])),
  }));
}

/**
 * 知識範囲 (タイムラインイベント ID の集合) を返す。Validator A2-08 が再利用する。
 */
export function knowledgeRange(characterId: string, timeline: TimelineEvent[]): Set<string> {
  return new Set(
    timeline
      .filter((e) => e.character === characterId || e.observedBy.includes(characterId))
      .map((e) => e.id)
  );
}

/**
 * 嘘の証言 (truthStatus === 'lie') から計画された嘘 (PlannedLie, 要件 §6.3) を導出する。
 * 隠したい真実は嘘をついたキャラの secret を流用する (なければ lieReason で代替)。
 * testimony スキーマが「嘘 ⇒ lieReason + 非空 contradictedBy」を保証するため、
 * 生成される PlannedLie は plannedLieSchema (reason/hiddenTruth/contradictedBy 必須) を満たす。
 */
export function derivePlannedLies(characters: Character[], testimonies: Testimony[]): PlannedLie[] {
  const secretById = new Map(characters.map((c) => [c.id, c.secret]));
  return testimonies
    .filter((t) => t.truthStatus === 'lie')
    .map((t) => {
      const reason = t.lieReason ?? '理由不明の隠蔽';
      const hiddenTruth = secretById.get(t.speakerId) ?? reason;
      return {
        liarId: t.speakerId,
        content: t.text,
        reason,
        hiddenTruth,
        contradictedBy: t.contradictedBy,
        reactionWhenExposed: '問い詰められると動揺し、別の話題へ逸らそうとする',
      };
    });
}
