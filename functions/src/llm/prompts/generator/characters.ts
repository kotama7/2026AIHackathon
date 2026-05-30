/**
 * A2-02: キャラクター思惑生成プロンプト。
 * 要件 §6.2: public_personality / private_goal / fear / secret / bias /
 * relationship / lie_policy / cooperation_policy を全 6 人分。
 *
 * id / is_werewolf / role / known_facts はコード側で注入するため、ここでは
 * LLM に「創作フィールド」のみ出させる。各 position N のキャラは char_{N}。
 */

export type BuildCharactersPromptArgs = {
  /** 容疑者 ID 群 (char_1..char_N)。position N のキャラは characterIds[N-1]。 */
  characterIds: string[];
  /** 被害者 ID (住民とは別人。relationships で被害者に言及してもよい) */
  victimId: string;
  /** 人狼の ID (この position のキャラに人狼向けの思惑を持たせる) */
  werewolfId: string;
  /** レッドヘリング村人の ID (人狼ではないが怪しく見える) */
  redHerringCharacterId: string;
  /** レッドヘリングが怪しく見える理由 (secret / lie_policy に反映させる) */
  redHerringReason: string;
  /** 多様性のためのシード (前回生成と被らないため) */
  diversitySeed?: string;
};

export function buildCharactersPrompt(args: BuildCharactersPromptArgs): string {
  const {
    characterIds,
    victimId,
    werewolfId,
    redHerringCharacterId,
    redHerringReason,
    diversitySeed,
  } = args;

  const count = characterIds.length;
  const werewolfIndex = characterIds.indexOf(werewolfId) + 1;
  const redHerringIndex = characterIds.indexOf(redHerringCharacterId) + 1;

  const idList = characterIds.map((id, i) => `  - position ${i + 1} = ${id}`).join('\n');

  return `## ロール
あなたは AI 人狼村のキャラクター設計者 (Truth Compiler の Generator) です。
夜間に 1 件の襲撃事件が起きた村の、生存する容疑者 ${count} 人分の「内面と思惑」を設計します。
プレイヤーは外部監査官として議論・証言・証拠からただ 1 人の人狼を論理的に特定します。
各キャラクターは固有の秘密・目的・恐れ・嘘の方針を持ち、それが議論を面白くします。

## キャラクターと position の対応 (厳守)
出力配列の N 番目 (1-indexed) は以下の容疑者に対応します:
${idList}
- 被害者は住民とは別人です (ID: ${victimId})。容疑者には含めませんが、relationships で被害者への関係に言及して構いません。

## 特別な指示
- 人狼は position ${werewolfIndex} (= ${werewolfId}) です。
  - この人物には「人狼であることを隠し生き残る」だけでなく、具体的なミスディレクション戦略を持つ private_goal を与えてください (例: 特定の村人に疑いを向ける、アリバイを偽装する等)。
  - secret は人狼であること・襲撃に関わる後ろ暗い事情を含意させ、lie_tendency は高め (おおむね 70〜95) にしてください。
  - lie_policy.will_lie_about に襲撃時の所在やアリバイに関するトピックを含めてください。
- レッドヘリング村人は position ${redHerringIndex} (= ${redHerringCharacterId}) です。
  - この人物は人狼ではありませんが「怪しく見える」よう設計します。怪しく見える理由は次の通り (襲撃そのものとは無関係な別の事情):
    「${redHerringReason}」
  - この理由を secret に反映し、lie_policy.will_lie_about にこの事情を隠すためのトピックを含めてください。あくまで人狼ではないので、襲撃そのものには関与していません。

## 各キャラクターの創作フィールド (全 ${count} 人分)
- name: 重複しない日本人名 (姓または姓名)。性別・年齢・職業の偏りが出ないよう多様に。
- publicPersonality: 表向きの性格 (1〜2 文)
- speakingStyle: 口調・話し方の特徴 (1 文)
- socialRole: 村内での立場 (例: 村長 / 鍛冶屋 / 医者 / 旅人 など)
- secret: 他人に見せない秘密 (必須・空文字禁止)
- privateGoal: 個人的な目的・このゲームで達成したいこと (必須・空文字禁止)
- fear: 恐れていること (必須・空文字禁止)
- bias: 疑いやすい/信じやすい傾向 (どんな相手をどう見るか)
- lieTendency: 0〜100 の整数。嘘をつく傾向の強さ。
- cooperationLevel: 0〜100 の整数。他者への協力度合い。
- emotionalState: "calm" | "tense" | "angry" | "fearful" | "guilty" | "confident" のいずれか。
- liePolicy: { "willLieAbout": [トピック文字列...], "willNotLieAbout": [トピック文字列...] }
- cooperationPolicy: { "cooperateWith": [対象の char_ id 配列], "conditions": "協力する条件の自由テキスト" }
- relationships: 他キャラとの関係配列。各要素 { "withCharacter": "char_X", "label": "友人/恋人/敵対/嫉妬 等", "affinity": -100〜100 の整数 }

## 出力形式
次の JSON のみを出力してください (説明文・前置き・コードフェンス不要)。配列はちょうど ${count} 要素:
{
  "characters": [
    {
      "name": "...",
      "publicPersonality": "...",
      "speakingStyle": "...",
      "socialRole": "...",
      "secret": "...",
      "privateGoal": "...",
      "fear": "...",
      "bias": "...",
      "lieTendency": 50,
      "cooperationLevel": 50,
      "emotionalState": "calm",
      "liePolicy": { "willLieAbout": ["..."], "willNotLieAbout": ["..."] },
      "cooperationPolicy": { "cooperateWith": ["char_2"], "conditions": "..." },
      "relationships": [
        { "withCharacter": "char_2", "label": "友人", "affinity": 40 }
      ]
    }
    // ... 残りの position も同様に
  ]
}

## 遵守事項
- characters はちょうど ${count} 要素。N 番目は上の対応表の char_{N}。
- name は全員相互に重複させない。
- secret / privateGoal / fear はいずれも空文字にしない (全員必須)。
- relationships / cooperationPolicy.cooperateWith の char_ id は char_1..char_${count} の範囲内にする (自分自身は含めない)。
- id / isWerewolf / role は出力しない (コード側で付与する)。
${diversitySeed ? `- 多様化シード: "${diversitySeed}"。過去の生成例と名前・性格・関係性が被らないようにする。` : ''}`;
}
