/**
 * A2-03: 夜間タイムライン生成プロンプト。
 * 各キャラの 23:00-01:00 の行動を物理整合つきで生成。
 *
 * 注意:
 * - イベント ID は後段でコードが `time_{i+1}` を採番する。LLM には出させない。
 * - causesEvidence も後段 (wireEvidenceToTimeline) で埋めるため LLM には出させない。
 */
import type { CaseSkeleton, Character } from '@village/shared';

export type BuildTimelinePromptArgs = {
  skeleton: CaseSkeleton;
  characters: Character[];
  /** 被害者 ID (住民とは別人、タイムラインには登場する) */
  victimId: string;
};

export function buildTimelinePrompt(args: BuildTimelinePromptArgs): string {
  const { skeleton, characters, victimId } = args;
  const { locationGraph } = skeleton;

  const suspectIds = characters.map((c) => c.id);

  const locationList = locationGraph.locations
    .map((loc) => `  - ${loc} (${locationGraph.displayNames[loc] ?? loc})`)
    .join('\n');

  const adjacencyList = locationGraph.locations
    .map((loc) => `  - ${loc}: ${(locationGraph.adjacency[loc] ?? []).join(', ') || '(なし)'}`)
    .join('\n');

  const charList = characters
    .map((c) => `  - ${c.id} (${c.name}, ${c.socialRole})${c.isWerewolf ? ' ← 人狼' : ''}`)
    .join('\n');

  return `## ロール
あなたはミステリー事件の「事件夜タイムライン」設計者 (Truth Compiler の Generator) です。
人狼村の事件当夜 (23:00〜01:00) に、各住民と被害者が「どこで・何をしていたか」を
物理的に矛盾のない時系列イベント列として設計します。

## 事件骨格 (確定済み・変更不可)
- 人狼: ${skeleton.werewolfId}
- 被害者: ${victimId} (住民とは別人。タイムラインには登場する)
- 襲撃時刻: ${skeleton.attackTime}
- 襲撃場所: ${skeleton.attackLocation} (${locationGraph.displayNames[skeleton.attackLocation] ?? skeleton.attackLocation})
- 襲撃経路の概要: ${skeleton.attackRoute}

## 登場人物
容疑者 (生存する AI 住民, ${suspectIds.length} 人):
${charList}
被害者 (タイムラインに登場するが容疑者ではない): ${victimId}

## 場所 (これ以外の場所は使わない)
${locationList}

## 隣接関係 (移動はこの隣接関係に従う。同じ場所への滞在は常に可)
${adjacencyList}

## 設計ルール
1. 容疑者 ${suspectIds.length} 人それぞれについて、23:00〜01:00 の行動を最低 3 イベント記述する。
2. 各キャラの連続するイベントは、同じ場所か「隣接した場所」でなければならない (瞬間移動 NG)。
3. 同一キャラが同一時刻に複数の場所にいてはならない。
4. 人狼 (${skeleton.werewolfId}) の移動経路は物理的に一貫させ、襲撃時刻 ${skeleton.attackTime} に襲撃場所 ${skeleton.attackLocation} にいるようにする。
5. 被害者 (${victimId}) は襲撃時刻 ${skeleton.attackTime} に襲撃場所 ${skeleton.attackLocation} にいる (必須イベント)。
6. 各イベントには知識範囲を必ず設定する:
   - knownBy: そのイベントを「実知識として知っている」キャラ ID 群。最低でも行動主体 (character) 自身を含める。
   - observedBy: そのイベントを「目撃した」キャラ ID 群。目撃者はその時刻・その場所に居合わせていなければならない (タイムライン上で物理的に整合すること)。目撃者がいなければ空配列でよい。
7. 各イベントの time は "HH:MM" (24h) 形式。23:00〜01:00 の範囲とする (00:00〜00:59 / 01:00 を含む)。
8. action は日本語の自由記述 (その時刻にその場所で何をしているか)。

## 出力形式
次の JSON のみを出力してください (説明文・前置き・コードフェンス不要)。
イベント ID や causesEvidence は出力しないでください (後段でコードが付与します)。
{
  "events": [
    {
      "time": "23:50",
      "character": "${skeleton.werewolfId}",
      "location": "<場所id>",
      "action": "<行動の説明>",
      "knownBy": ["${skeleton.werewolfId}"],
      "observedBy": []
    }
  ]
}

## 遵守事項
- character / location / knownBy / observedBy に使う ID は、上記の容疑者・被害者 ID と場所 ID のみ。
- 被害者 (${victimId}) が襲撃時刻 ${skeleton.attackTime} に襲撃場所 ${skeleton.attackLocation} にいるイベントを必ず含める。
- 人狼が襲撃時刻 ${skeleton.attackTime} に襲撃場所 ${skeleton.attackLocation} にいるイベントを必ず含める。
- 各容疑者のイベントは最低 3 件。
- observedBy のキャラは、そのイベントと同じ時刻・場所にいる別イベントを持つこと (居合わせの整合)。`;
}
