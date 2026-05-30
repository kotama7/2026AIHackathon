/**
 * A2-05: 証言生成プロンプト。
 * 要件 §6.5: truth / lie / misunderstanding / omission / uncertainty に分類、
 * 嘘には lie_reason と contradicted_by が必須。
 */
import type { CaseSkeleton, Character, Evidence, TimelineEvent } from '@village/shared';

export type BuildTestimoniesPromptArgs = {
  skeleton: CaseSkeleton;
  characters: Character[];
  timeline: TimelineEvent[];
  evidence: Evidence[];
};

/** timeline イベント id → 説明文 (時刻 + 場所 + 行動) のマップを作る。 */
function timelineDescriptions(timeline: TimelineEvent[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const e of timeline) {
    map.set(e.id, `${e.time} @${e.location}: ${e.action}`);
  }
  return map;
}

/** 1 キャラの知識範囲ブロック (knownFacts の id + 説明) を整形する。 */
function knownFactsBlock(character: Character, descById: Map<string, string>): string {
  if (character.knownFacts.length === 0) {
    return '    (このキャラは事件について直接知っている事実がない — 推測や不確かな証言のみ可能)';
  }
  return character.knownFacts
    .map((id) => `    - ${id}: ${descById.get(id) ?? '(説明なし)'}`)
    .join('\n');
}

/** 1 キャラの context ブロックを整形する。 */
function characterBlock(character: Character, descById: Map<string, string>): string {
  return `### ${character.id} (${character.name})
- 表向きの性格: ${character.publicPersonality}
- 口調: ${character.speakingStyle}
- 秘密: ${character.secret}
- 個人的な目的: ${character.privateGoal}
- 恐れていること: ${character.fear}
- 嘘をつく傾向 (0-100): ${character.lieTendency}
- 嘘をつきうるトピック: ${character.liePolicy.willLieAbout.join(', ') || '(なし)'}
- 絶対に嘘をつかないトピック: ${character.liePolicy.willNotLieAbout.join(', ') || '(なし)'}
- 知識範囲 (knownFacts — このキャラだけが証言で参照できる事実 id):
${knownFactsBlock(character, descById)}`;
}

/** 証拠一覧ブロック (id + 何を示すか) を整形する。contradictedBy の配線に使う。 */
function evidenceBlock(evidence: Evidence[]): string {
  return evidence
    .map(
      (ev) =>
        `- ${ev.id} [${ev.category}] ${ev.name}: ${ev.description} (真意: ${ev.trueInterpretation})`
    )
    .join('\n');
}

export function buildTestimoniesPrompt(args: BuildTestimoniesPromptArgs): string {
  const { skeleton, characters, timeline, evidence } = args;
  const descById = timelineDescriptions(timeline);

  const charactersText = characters.map((c) => characterBlock(c, descById)).join('\n\n');
  const evidenceText = evidenceBlock(evidence);
  const speakerIds = characters.map((c) => c.id).join(', ');

  return `## ロール
あなたはミステリー事件の証言設計者 (Truth Compiler の Generator) です。
事件の夜について、各 AI 住民 (容疑者) が議論の場で語る「証言」を設計します。
プレイヤーは外部監査官として、これらの証言と証拠を突き合わせ、ただ 1 人の人狼を論理的に特定します。

## 事件の前提
- 人狼 (真犯人): ${skeleton.werewolfId}
- 被害者: ${skeleton.victimId}
- 襲撃時刻: ${skeleton.attackTime} / 襲撃場所: ${skeleton.attackLocation}
- レッドヘリング (人狼ではないが怪しく見える): ${skeleton.redHerringCharacterId} — ${skeleton.redHerringReason}
- 解決ロジック: ${skeleton.solutionLogic}

## 容疑者 (証言の話者)
証言の話者はこの ${characters.length} 人のみ。speakerId はこの中から選ぶ: ${speakerIds}

${charactersText}

## 証拠一覧 (contradictedBy の配線に使う)
嘘の証言を崩す証拠は必ずこの id から選ぶこと:
${evidenceText}

## 証言設計のルール
1. 各話者から最低 2 件、合計 ${characters.length * 2} 件以上の証言を作る。
2. 各証言の truthStatus は次のいずれか:
   - truth: 真実
   - lie: 意図的な嘘
   - misunderstanding: 本人は真実と信じているが事実と異なる誤解
   - omission: 重要な情報をあえて語らない隠蔽
   - uncertainty: 自信のない曖昧な証言
3. 嘘 (lie) には必ず:
   - lieReason: なぜ嘘をつくのか の「具体的な」理由。
     「怪しく見せるため」のような中身のない理由は禁止。
     秘密・個人的目的・恐れ (上記の各キャラ context) に根ざした理由にすること。
   - contradictedBy: その嘘を崩せる証拠 id を 1 つ以上 (上記証拠一覧から)。
     嘘は必ず「崩せる」ようにする。
4. 人狼 (${skeleton.werewolfId}) の嘘の少なくとも 1 件は、確定証拠 (confirmatory) で
   明確に崩れる「分かりやすい矛盾」にすること。
5. knownFactsUsed: 各証言が参照する事実は、その話者の knownFacts (上記知識範囲) の id の
   部分集合でなければならない。話者が知らない事実を証言に使ってはならない。
   推測・伝聞・曖昧な印象だけで語る証言は knownFactsUsed を空配列にする。
6. レッドヘリング (${skeleton.redHerringCharacterId}) は、事件とは無関係な別の秘密ゆえに
   嘘や隠蔽をして怪しく見えるが、人狼ではない。
7. id は付けない (コード側で t1, t2... と採番する)。

## 出力形式
次の JSON のみを出力してください (説明文・前置き・コードフェンス不要):
{
  "testimonies": [
    {
      "day": 1,
      "speakerId": "${characters[0]?.id ?? 'char_1'}",
      "text": "証言の本文 (その話者の口調で)",
      "truthStatus": "truth | lie | misunderstanding | omission | uncertainty",
      "lieReason": "lie のときのみ: 嘘の具体的理由",
      "contradictedBy": ["lie のときのみ: 崩せる証拠 id を 1 つ以上"],
      "knownFactsUsed": ["この証言が参照した話者の knownFacts の id (部分集合)"]
    }
  ]
}

## 遵守事項
- day は 1〜3 の整数。
- speakerId は容疑者 id (${speakerIds}) のいずれか。
- 各話者から最低 2 件、合計 ${characters.length * 2} 件以上。
- lie には lieReason (具体的) と非空の contradictedBy が必須。lie 以外では両方とも省略 (または空) にする。
- knownFactsUsed は話者の knownFacts の部分集合のみ。範囲外の id を絶対に含めない。`;
}
