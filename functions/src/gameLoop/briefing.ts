import type { CaseTruth } from '@village/shared';
import { z } from 'zod';

import { TEMPERATURE } from '../llm/geminiClient.js';
import { generateStructured } from '../llm/validateAndRetry.js';

const briefingSchema = z.object({
  briefing: z.string().min(1),
});

/**
 * 事件導入ブリーフィング (ネタバレなし) を 1 回の LLM 呼び出しで生成する。
 *
 * プレイヤー (外部監査官) に Day1 開始時点で事件の概要を提示するための短い文章。
 * - いつ・どこで・何が起きたか (被害発生)
 * - 容疑者は誰か (名前と肩書き)
 * - プレイヤーの目的
 * を 3〜5 文で述べる。**犯人 (人狼) は絶対に明かさない**。
 *
 * 構造化データには被害者名/場所の表示名が無いため、容疑者情報と襲撃時刻を素材に
 * LLM へ自然な導入文を書かせる。失敗時は呼び出し側で静的文にフォールバックする。
 */
export async function generateIncidentBriefing(caseTruth: CaseTruth): Promise<string> {
  const suspects = caseTruth.characters.map((c) => `  - ${c.name} (${c.socialRole})`).join('\n');

  const prompt = `あなたは「AI 村裁判」という人狼推理ゲームの導入ナレーションを書く担当です。
外部監査官であるプレイヤーに、これから調査する事件の概要を提示してください。

# 事件の事実
- 昨夜、村で住民の一人が何者かに襲われ命を落とした (襲撃時刻の目安: ${caseTruth.summary.attackTime} 頃)。
- 村には人狼が 1 体紛れ込んでおり、それが犯人である。
- 容疑者は次の村人たちである:
${suspects}

# 出力要件
- 3〜5 文の自然な日本語で、事件の導入ナレーションを書く。
- 「いつ・どこで・何が起きたか」「容疑者が誰か」「プレイヤー(外部監査官)が3日以内に真犯人を見つける使命」を含める。
- **誰が犯人 (人狼) かは絶対に書かない / 示唆しない**。容疑者は全員平等に疑わしく描く。
- char_1 のような内部 ID は書かず、必ず上記の名前を使う。
- 緊張感のある、物語的な語り口。
- JSON のみを出力: {"briefing": "<導入文>"}`;

  const { data } = await generateStructured({
    schema: briefingSchema,
    prompt,
    temperature: TEMPERATURE.SPEAKER,
    maxAttempts: 2,
    traceLabel: 'briefing',
  });
  return data.briefing.trim();
}
