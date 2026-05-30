/**
 * A2-06: deduction_path 生成プロンプト。
 * 要件 §6.6: 推理可能性を保証する step 列。各 step に required_evidence /
 * required_testimonies / excluded_suspects を含める。
 */

export type BuildDeductionPathPromptArgs = {
  /** 人狼 ID (= finalTarget) */
  werewolfId: string;
  /** 全容疑者 ID 群 (char_1..char_6) */
  suspectIds: string[];
  /** 証拠一覧 (推理材料として提示) */
  evidence: Array<{
    id: string;
    pointsTo: string[];
    category: string;
    description: string;
  }>;
  /** 証言一覧 (推理材料として提示) */
  testimonies: Array<{
    id: string;
    speaker: string;
    truthStatus: string;
    text: string;
  }>;
  /** 骨格の解決ロジック概要 (自然言語) */
  solutionLogic: string;
};

export function buildDeductionPathPrompt(args: BuildDeductionPathPromptArgs): string {
  const { werewolfId, suspectIds, evidence, testimonies, solutionLogic } = args;

  const evidenceLines = evidence
    .map(
      (e) => `  - ${e.id} [${e.category}] pointsTo=${e.pointsTo.join('/') || '-'}: ${e.description}`
    )
    .join('\n');

  const testimonyLines = testimonies
    .map((t) => `  - ${t.id} (${t.speaker}, ${t.truthStatus}): ${t.text}`)
    .join('\n');

  const otherSuspects = suspectIds.filter((id) => id !== werewolfId);

  return `## ロール
あなたはミステリー事件の「推理経路」設計者 (Truth Compiler の Generator) です。
プレイヤー (外部監査官) が証拠と証言をどの順で組み合わせれば、ただ 1 人の人狼に
論理的に到達できるかを示す「推理の階段 (deduction_path)」を 1 つ設計します。

## 確定情報 (内部の真相)
- 容疑者は ${suspectIds.length} 人: ${suspectIds.join(', ')}
- 人狼はちょうど 1 人: ${werewolfId} (= finalTarget)
- 解決ロジック概要: ${solutionLogic}

## 利用可能な証拠 (この id のみ required_evidence に使える)
${evidenceLines || '  (なし)'}

## 利用可能な証言 (この id のみ required_testimonies に使える)
${testimonyLines || '  (なし)'}

## 出力形式
次の JSON のみを出力してください (説明文・前置き・コードフェンス不要):
{
  "steps": [
    {
      "step": 1,
      "reasoning": "この step の推理内容を自然言語で",
      "requiredEvidence": ["ev_x", ...],
      "requiredTestimonies": ["t_x", ...],
      "excludedSuspects": ["char_x", ...]
    }
  ],
  "finalTarget": "${werewolfId}"
}

## 遵守事項
- steps は 3〜5 個。step 番号は 1 から連番にする。
- finalTarget は必ず ${werewolfId} にする。
- 各 step の reasoning は、その step で挙げた証拠・証言から論理的に導けるものにする。
- requiredEvidence の id は上記「利用可能な証拠」に実在する id のみ。
- requiredTestimonies の id は上記「利用可能な証言」に実在する id のみ。
- excludedSuspects には容疑者 id (char_X) のみを入れる。
- step を追うごとに容疑者が順次絞り込まれていくようにする。
- 全 step の excludedSuspects を合わせると、人狼 ${werewolfId} を除く残り全員
  (${otherSuspects.join(', ')}) がちょうど除外され、最後に ${werewolfId} だけが残る構成にする。
  (同じ容疑者が複数 step で重複して除外されても良いが、最終的に上記 5 人が全員除外されること)`;
}
