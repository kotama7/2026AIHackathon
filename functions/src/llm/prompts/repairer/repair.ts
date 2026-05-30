/**
 * A2-10: Repairer プロンプト。
 * Validator の指摘を受けて CaseTruth を最小修正する。
 * 全体再生成ではなく RFC 6902 の JSON Patch (差分) を返させる。
 */
import type { CaseTruth, ValidationIssue } from '@village/shared';

export type BuildRepairPromptArgs = {
  truth: CaseTruth;
  issues: ValidationIssue[];
};

export function buildRepairPrompt(args: BuildRepairPromptArgs): string {
  const { truth, issues } = args;

  const issueList = issues
    .map((i, n) => {
      const ids = i.relatedIds?.length ? ` [関連: ${i.relatedIds.join(', ')}]` : '';
      return `  ${n + 1}. (${i.category}) ${i.message}${ids}`;
    })
    .join('\n');

  return `## ロール
あなたは Truth Compiler の Repairer です。
検証器 (Validator) が指摘した不備を、事件真相 (CaseTruth) の **最小限の変更** で解消します。
全体を作り直してはいけません。問題箇所だけをピンポイントで直します。

## 絶対に変更してはいけない箇所 (ロック)
- summary.werewolfId (人狼): "${truth.summary.werewolfId}"
- summary.victimId (被害者): "${truth.summary.victimId}"
- characters の人数 (6 人) と各 id
- 各エンティティの id (evidence_id / testimony_id / timeline event id など)

## 検証で見つかった不備
${issueList}

## 修正のヒント (不備カテゴリ別)
- deducibility: 証拠の weight / pointsTo を調整してスコア条件 (真犯人 7-10, 最大レッドヘリング 4-6, 差 2-4, 真犯人を指す証拠 2 件以上) を満たす。deduction_path の excludedSuspects を直して接続を回復する。
- logic: タイムラインの time / location / observedBy を直し、物理的矛盾 (同時刻に複数地点・到達不可能・目撃不能) を解消する。証言の knownFactsUsed をキャラの知識範囲内に収める。
- motivation: 不足している privateGoal を補う。嘘の証言に lieReason を補う。

## 現在の CaseTruth (JSON)
\`\`\`json
${JSON.stringify(truth)}
\`\`\`

## 出力形式
不備を解消するための JSON Patch (RFC 6902) を、次の形の JSON のみで返してください。説明文は不要です。
{
  "patches": [
    { "op": "replace", "path": "/evidence/2/weight", "value": 3 },
    { "op": "replace", "path": "/deductionPath/steps/0/excludedSuspects", "value": ["char_2", "char_4"] },
    { "op": "add", "path": "/testimonies/5/lieReason", "value": "密会を隠すため" }
  ]
}

## 制約
- path は上記 CaseTruth の構造に対する正しい JSON Pointer にする (配列は 0 始まりの index)。
- ロック対象を変更する patch は出力しない。
- 不備を解消するのに必要な最小限の patch だけを出力する。
- 直しようがない不備しかない場合は { "patches": [] } を返す。`;
}
