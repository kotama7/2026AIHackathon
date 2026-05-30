/**
 * A2-01: 事件骨格生成プロンプト。
 * 要件 §6.1 の項目 (人狼/被害者/襲撃時刻/襲撃場所/襲撃経路/主要証拠タイプ/
 * レッドヘリング/解決ロジック) を一度に生成する。
 */

export type BuildCaseSkeletonPromptArgs = {
  /** キャラクター数 (MVP は 6 固定) */
  characterCount: number;
  /** 難易度 */
  difficulty: 'easy' | 'normal' | 'hard';
  /** 容疑者 ID 群 (char_1..char_N)。werewolf / redHerring はこの中から選ぶ。 */
  characterIds: string[];
  /** 被害者 ID (住民とは別人) */
  victimId: string;
  /** 多様性のためのシード (前回生成と被らないため) */
  diversitySeed?: string;
};

const DIFFICULTY_NOTE: Record<'easy' | 'normal' | 'hard', string> = {
  easy: '手がかりは明快に。レッドヘリングは弱め、推理経路は 3 step 程度。',
  normal: '確定証拠とノイズのバランスを取り、推理経路は 3〜4 step。',
  hard: 'レッドヘリングを強めに。誤誘導を効かせつつ、必ず論理的に解けること。推理経路は 4〜5 step。',
};

export function buildCaseSkeletonPrompt(args: BuildCaseSkeletonPromptArgs): string {
  const { characterCount, difficulty, characterIds, victimId, diversitySeed } = args;

  return `## ロール
あなたはミステリー事件の構造設計者 (Truth Compiler の Generator) です。
全員が AI 住民で構成された人狼村で、夜間に 1 件の襲撃事件が起きます。
プレイヤーは外部監査官として、議論ログ・証拠・証言からただ 1 人の人狼を論理的に特定します。
あなたの仕事は、その「事件骨格」を 1 つ設計することです。

## 入力 / 制約条件
- 容疑者 (生存する AI 住民) は ${characterCount} 人。ID は固定: ${characterIds.join(', ')}
- 被害者は住民とは別人。ID は固定: ${victimId} (容疑者には含めない)
- 人狼はちょうど 1 人。容疑者 ID から選ぶ。
- レッドヘリング村人を 1 人選ぶ (人狼とは別人)。「人狼ではないが怪しく見える」合理的理由を必ず持たせる。
- 襲撃時刻は 23:00〜01:00 の "HH:MM" 形式。
- 場所は 6〜8 個。各場所に id (snake_case の英字) と日本語表示名を付ける。
- 場所の隣接関係 (adjacency) を定義する。移動は隣接した場所間でのみ可能とする。
- 襲撃場所は定義した場所のいずれか。
- 難易度: ${difficulty} — ${DIFFICULTY_NOTE[difficulty]}
${diversitySeed ? `- 多様化シード: "${diversitySeed}"。過去の生成例と人狼・被害者・場所・動機が被らないようにする。` : ''}

## 出力形式
次の JSON のみを出力してください (説明文・前置き・コードフェンス不要):
{
  "werewolfId": "char_X",
  "victimId": "${victimId}",
  "attackTime": "00:10",
  "attackLocation": "<場所id>",
  "attackRoute": "人狼が襲撃場所へ向かった動線の説明 (どの場所を経由したか)",
  "primaryEvidenceTypes": ["door_log", "footprint", "torn_note", ...],
  "redHerringCharacterId": "char_Y",
  "redHerringReason": "そのレッドヘリング村人が怪しく見える具体的理由 (事件とは無関係な別の秘密で説明できること)",
  "solutionLogic": "プレイヤーが人狼に到達する推理の概要 (自然言語、2〜4 文)",
  "locationGraph": {
    "locations": ["<場所id>", ...],
    "adjacency": { "<場所id>": ["<隣接場所id>", ...], ... },
    "displayNames": { "<場所id>": "<日本語表示名>", ... }
  }
}

## 遵守事項
- werewolfId と redHerringCharacterId は異なる容疑者にする。
- attackLocation は locations に含める。
- adjacency / displayNames のキーは locations と完全一致させる。
- adjacency は対称 (A が B に隣接するなら B も A に隣接) にする。
- レッドヘリングの理由は「人狼にするため」ではなく、別の人間的な事情 (密会・借金・過去の確執など) にする。`;
}
