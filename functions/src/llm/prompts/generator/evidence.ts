/**
 * A2-04: 証拠生成プロンプト。
 * 要件 §6.4: 確定 / 補助 / ノイズの 3 階層、各 timeline event から派生。
 */
import type { CaseSkeleton, Character, TimelineEvent } from '@village/shared';

export type BuildEvidencePromptArgs = {
  skeleton: CaseSkeleton;
  characters: Character[];
  timeline: TimelineEvent[];
  /** 推理可能性スコアの目標値 (Validator が後段でチェックする) */
  scoreTargets: {
    werewolfMin: number;
    werewolfMax: number;
    redHerringMin: number;
    redHerringMax: number;
    gapMin: number;
    gapMax: number;
  };
  /** weight の既定値 (confirmatory/supporting/noise) */
  weightDefaults: { confirmatory: number; supporting: number; noise: number };
};

/** プロンプトに提示する証拠タイプ辞書 */
const EVIDENCE_TYPE_DICTIONARY: Array<{ key: string; label: string }> = [
  { key: 'door_log', label: '扉ログ (入退室の記録)' },
  { key: 'footprint', label: '足跡' },
  { key: 'message', label: 'メッセージ (手紙・チャット・走り書き)' },
  { key: 'camera', label: '監視カメラ映像' },
  { key: 'physical_item', label: '物的遺留品 (落とし物・凶器など)' },
  { key: 'witness_fragment', label: '目撃証言断片' },
];

export function buildEvidencePrompt(args: BuildEvidencePromptArgs): string {
  const { skeleton, characters, timeline, scoreTargets, weightDefaults } = args;

  const displayNames = skeleton.locationGraph.displayNames;

  const charLines = characters
    .map((c) => {
      const tags: string[] = [];
      if (c.id === skeleton.werewolfId) tags.push('★人狼');
      if (c.id === skeleton.redHerringCharacterId) tags.push('▲レッドヘリング');
      const tag = tags.length ? ` [${tags.join(' / ')}]` : '';
      return `- ${c.id}: ${c.name} (${c.socialRole})${tag}`;
    })
    .join('\n');

  const timelineLines = timeline
    .map((e) => {
      const loc = displayNames[e.location] ?? e.location;
      return `- ${e.id} | ${e.time} | ${e.character} | ${loc}(${e.location}) | ${e.action}`;
    })
    .join('\n');

  const timelineIds = timeline.map((e) => e.id).join(', ');

  const typeLines = EVIDENCE_TYPE_DICTIONARY.map((t) => `  - ${t.key}: ${t.label}`).join('\n');

  return `## ロール
あなたはミステリー事件の証拠デザイナー (Truth Compiler の Generator) です。
すでに決まっている事件骨格・タイムラインから、プレイヤーが人狼を論理的に特定できる
「3 階層の証拠セット」を設計します。

## 事件骨格
- 人狼 (真犯人): ${skeleton.werewolfId}
- レッドヘリング村人 (人狼ではないが怪しく見える): ${skeleton.redHerringCharacterId}
- 襲撃時刻: ${skeleton.attackTime} / 襲撃場所: ${displayNames[skeleton.attackLocation] ?? skeleton.attackLocation}(${skeleton.attackLocation})
- 解決ロジック: ${skeleton.solutionLogic}

## 容疑者
${charLines}

## タイムライン (証拠は必ずこのイベントのいずれかから派生させる)
${timelineLines}

利用可能な timeline event ID: ${timelineIds}

## 証拠タイプ辞書 (name / description はこれらを参考に)
${typeLines}

## 3 階層の設計ルール (要件 §6.4)
- confirmatory (確定証拠): **2 枚以上**。人狼 ${skeleton.werewolfId} を強く指す。pointsTo に人狼を含める。
- supporting (補助証拠): **2 枚以上**。確定証拠を補強する。多くは人狼を、一部はレッドヘリングを指す。
- noise (ノイズ証拠): **2 枚以上**。レッドヘリング ${skeleton.redHerringCharacterId} や他の人物を指し、曖昧で別解釈が可能。
- 各証拠は 1 つ以上の timeline event ID を sourceTimelineEvent に持つ (上のリストの ID から選ぶ。存在しない ID は不可)。
- day は 1〜3 に分散させる (1 日あたり 3 枚程度を目安)。

## スコア設計 (重要 — 後段の Validator が検証する)
証拠スコア = 「pointsTo にその人物を含む証拠の weight 合計」。
- 人狼 ${skeleton.werewolfId} の合計: ${scoreTargets.werewolfMin}〜${scoreTargets.werewolfMax}
- レッドヘリング ${skeleton.redHerringCharacterId} の合計: ${scoreTargets.redHerringMin}〜${scoreTargets.redHerringMax}
- 人狼とレッドヘリングの差 (gap): ${scoreTargets.gapMin}〜${scoreTargets.gapMax}
weight の目安: confirmatory=${weightDefaults.confirmatory}, supporting=${weightDefaults.supporting}, noise=${weightDefaults.noise}。
ただし目標スコアに収めるため weight は 0〜5 の範囲で調整してよい。

## 出力形式
次の JSON のみを出力してください (説明文・前置き・コードフェンス不要)。
id はコード側で採番するため出力しないでください。
{
  "evidence": [
    {
      "day": 1,
      "name": "<証拠名>",
      "description": "<プレイヤーに見える説明>",
      "category": "confirmatory" | "supporting" | "noise",
      "reliability": "A" | "B" | "C",
      "relatedCharacters": ["char_X", ...],
      "pointsTo": ["char_X", ...],
      "weight": 0-5,
      "ambiguity": 0-3,
      "trueInterpretation": "<真相開示時に表示する真の意味>",
      "sourceTimelineEvent": "<上記タイムラインの event ID>"
    }
  ]
}

## 遵守事項
- confirmatory / supporting / noise をそれぞれ 2 枚以上含める。
- pointsTo / relatedCharacters は実在する容疑者 ID にする。pointsTo は最低 1 件。
- sourceTimelineEvent は必ず上のタイムライン ID のいずれかにする。
- reliability A は信頼性高 (確定向き)、C は低 (ノイズ向き) の目安。
- ノイズ証拠の trueInterpretation には「人狼とは無関係である別の説明」を書く。`;
}
