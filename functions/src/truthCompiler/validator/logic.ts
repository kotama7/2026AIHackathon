/**
 * A2-08: Validator 論理整合性検証 (純ロジック / LLM 非依存)。
 *
 * 要件 §7.2 の物理的整合とキャラクター知識範囲を検証する:
 *  1. 同一人物が同時刻に複数地点に存在しない (容疑者 + 被害者)。
 *  2. 人狼は襲撃時刻に襲撃現場へ到達でき、連続イベントの場所が隣接マトリクス上で繋がる。
 *  3. 被害者は襲撃時刻に襲撃現場にいる。
 *  4. 各証拠の sourceTimelineEvent が実在する。
 *  5. 目撃者 (observedBy) は対象イベントと同一場所・同一時刻に自身のイベントを持つ。
 *  6. 各証言の knownFactsUsed が話者の知識範囲 (knowledgeRange) に収まる。
 *
 * 失敗は全て category 'logic' / severity 'error' の ValidationIssue として返す。
 */
import type { CaseTruth, TimelineEvent, ValidationIssue, ValidationResult } from '@village/shared';

import { knowledgeRange } from '../stitch.js';

/**
 * "HH:MM" を「夜の経過分」に変換する。
 * この事件夜は 23:00 → 01:00 をまたぐため、単純な辞書順比較では 00:05 < 23:50 となり破綻する。
 * 23 時台はそのまま、00/01 時台は +24h して連続させる (23:00→23:59, 00:00→24:00, 01:00→25:00)。
 */
function toNightMinutes(time: string): number {
  const [hStr, mStr] = time.split(':');
  const h = Number(hStr ?? '0');
  const m = Number(mStr ?? '0');
  const adjustedHour = h < 12 ? h + 24 : h;
  return adjustedHour * 60 + m;
}

/**
 * 人狼の連続イベント (時系列順) の場所が、隣接マトリクス上で隣接 (or 同一) かを判定する。
 * 1 ステップでも非隣接の飛びがあれば false。
 */
function isReachablePath(events: TimelineEvent[], adjacency: Record<string, string[]>): boolean {
  const sorted = [...events].sort((a, b) => toNightMinutes(a.time) - toNightMinutes(b.time));
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    if (prev.location === curr.location) continue;
    const neighbors = adjacency[prev.location] ?? [];
    if (!neighbors.includes(curr.location)) {
      return false;
    }
  }
  return true;
}

export function validateLogic(truth: CaseTruth): ValidationResult {
  const start = Date.now();
  const issues: ValidationIssue[] = [];

  const { timeline, evidence, testimonies, summary, locationGraph } = truth;
  const { victimId, werewolfId, attackTime, attackLocation } = summary;

  // ---------------------------------------------------------------------------
  // 1. 同一人物が同時刻に複数地点に存在しない (容疑者 + 被害者)
  // ---------------------------------------------------------------------------
  const byCharTime = new Map<string, TimelineEvent[]>();
  for (const e of timeline) {
    const key = `${e.character}@${e.time}`;
    const list = byCharTime.get(key) ?? [];
    list.push(e);
    byCharTime.set(key, list);
  }
  for (const [, events] of byCharTime) {
    const locations = new Set(events.map((e) => e.location));
    if (locations.size > 1) {
      const first = events[0]!;
      issues.push({
        category: 'logic',
        severity: 'error',
        message: `${first.character} が ${first.time} に複数の場所 (${[...locations].join(', ')}) に同時に存在しています。`,
        relatedIds: events.map((e) => e.id),
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 2. 人狼は襲撃時刻に襲撃現場へ到達可能 (隣接マトリクスで判定)
  // ---------------------------------------------------------------------------
  const werewolfEvents = timeline.filter((e) => e.character === werewolfId);
  const werewolfAtScene = werewolfEvents.some(
    (e) => e.location === attackLocation && e.time === attackTime
  );
  if (!werewolfAtScene) {
    issues.push({
      category: 'logic',
      severity: 'error',
      message: `人狼 ${werewolfId} は襲撃時刻 ${attackTime} に襲撃現場 ${attackLocation} のタイムラインイベントを持っていません。`,
      relatedIds: [werewolfId, attackLocation],
    });
  }
  if (!isReachablePath(werewolfEvents, locationGraph.adjacency)) {
    issues.push({
      category: 'logic',
      severity: 'error',
      message: `人狼 ${werewolfId} の移動経路に隣接マトリクス上で繋がらない飛びがあり、物理的に到達不可能です。`,
      relatedIds: werewolfEvents.map((e) => e.id),
    });
  }

  // ---------------------------------------------------------------------------
  // 3. 被害者は襲撃時刻に襲撃現場にいる
  // 被害者のイベントは襲撃の直前を指すこともある (例: 待ち合わせ) ため、襲撃時刻と
  // 同一場所・近接時刻 (±15 分) を「現場にいる」とみなす。場所違い / 時刻乖離は失敗。
  // ---------------------------------------------------------------------------
  const PRESENCE_WINDOW_MIN = 15;
  const attackMinutes = toNightMinutes(attackTime);
  const victimAtScene = timeline.some(
    (e) =>
      e.character === victimId &&
      e.location === attackLocation &&
      Math.abs(toNightMinutes(e.time) - attackMinutes) <= PRESENCE_WINDOW_MIN
  );
  if (!victimAtScene) {
    issues.push({
      category: 'logic',
      severity: 'error',
      message: `被害者 ${victimId} は襲撃時刻 ${attackTime} に襲撃現場 ${attackLocation} にいません。`,
      relatedIds: [victimId, attackLocation],
    });
  }

  // ---------------------------------------------------------------------------
  // 4. 各証拠の sourceTimelineEvent が実在
  // ---------------------------------------------------------------------------
  const eventIds = new Set(timeline.map((e) => e.id));
  for (const ev of evidence) {
    if (!eventIds.has(ev.sourceTimelineEvent)) {
      issues.push({
        category: 'logic',
        severity: 'error',
        message: `証拠 ${ev.id} の sourceTimelineEvent (${ev.sourceTimelineEvent}) が存在しないタイムラインイベントを参照しています。`,
        relatedIds: [ev.id, ev.sourceTimelineEvent],
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 5. visibility: observedBy の各キャラは対象イベントと同一場所・近接時刻 (±15 分) に
  // 自身のイベントを持つ (居合わせなければ目撃できない)。完全な時刻一致を要求すると
  // 同席者がわずかに別時刻のイベントを持つ正規ケースを誤判定するため窓を許容する。
  // ---------------------------------------------------------------------------
  for (const e of timeline) {
    const eMinutes = toNightMinutes(e.time);
    for (const observer of e.observedBy) {
      const coLocated = timeline.some(
        (o) =>
          o.character === observer &&
          o.location === e.location &&
          Math.abs(toNightMinutes(o.time) - eMinutes) <= PRESENCE_WINDOW_MIN
      );
      if (!coLocated) {
        issues.push({
          category: 'logic',
          severity: 'error',
          message: `${observer} はイベント ${e.id} (${e.location} / ${e.time}) と同じ場所・時刻にいないため、目撃できません。`,
          relatedIds: [e.id, observer],
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 6. 各証言の knownFactsUsed が話者の知識範囲内
  // ---------------------------------------------------------------------------
  for (const t of testimonies) {
    const range = knowledgeRange(t.speakerId, timeline);
    const outside = t.knownFactsUsed.filter((id) => !range.has(id));
    if (outside.length > 0) {
      issues.push({
        category: 'logic',
        severity: 'error',
        message: `証言 ${t.id} (話者 ${t.speakerId}) の knownFactsUsed [${outside.join(', ')}] が話者の知識範囲外です。`,
        relatedIds: [t.id, t.speakerId, ...outside],
      });
    }
  }

  const passed = issues.every((i) => i.severity !== 'error');
  return { passed, issues, durationMs: Date.now() - start };
}
