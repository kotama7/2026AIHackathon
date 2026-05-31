# AI村裁判 (2026 AI ハッカソン)

**AI村裁判** は、全員が AI キャラクターで構成された人狼村を、プレイヤーが村人としてではなく **外部監査官・裁判官** として調査し、人狼を特定する一人用推理ゲームです。プレイヤーは AI 住民同士の議論ログ・証言・証拠・夜間行動ログ・尋問結果を分析し、裁判で処刑対象を決定します。本作の核は自然な発言生成そのものではなく、**ゲーム開始時に固定された「推理可能な真相」** にあります。LLM は真相案生成・発言生成・弁明生成に使われますが、進行中に真相を改変することはありません。

- 遊び方: [docs/play-guide.md](docs/play-guide.md)
- 開発環境構築: [docs/dev-setup.md](docs/dev-setup.md)
- 仕様: [要件定義書/基礎情報.md](要件定義書/基礎情報.md)
- 実装計画: [要件定義書/実装計画.md](要件定義書/実装計画.md)
- タスク一覧: [tasks/INDEX.md](tasks/INDEX.md) (81 タスク / 173h / GitHub Issue 自動同期)

## ジャンル

- 一人用推理ゲーム / AI エージェント観察ゲーム
- 人狼風正体隠匿ゲーム / 会話ログ解析ゲーム
- 裁判・尋問型アドベンチャーゲーム

## 目標体験

- AI 同士の議論から違和感を読み取る
- 嘘・誤解・誘導・沈黙・矛盾を見抜く
- 限られた尋問リソースを使って真相に近づく
- 証拠と証言を組み合わせて容疑者を追い詰める
- **村人も合理的な理由で嘘をつく** 状況を推理する
- 誤った裁判による冤罪リスクを背負い、不確実性の中で判断する

## 技術スタック

| 領域           | 採用技術                                                           |
| -------------- | ------------------------------------------------------------------ |
| フロントエンド | Next.js 15 (App Router) + TypeScript + Tailwind CSS + Zustand      |
| ホスティング   | Firebase Hosting (web frameworks / Next.js SSR, `asia-northeast1`) |
| バックエンド   | Firebase Cloud Functions (Node 20, TypeScript)                     |
| データベース   | Firestore (Native mode, `asia-northeast1`)                         |
| 認証           | Firebase Anonymous Authentication                                  |
| LLM            | Gemini (無料枠 / `@google/generative-ai`)                          |
| 共有           | zod スキーマ + 共有型 (`packages/shared`)                          |
| 開発基盤       | pnpm 11.5 monorepo / ESLint (flat config) / Prettier / Jest        |

## モノレポ構成 (pnpm workspace)

```
apps/web/            # Next.js フロントエンド (Person B 主担当)
functions/           # Cloud Functions / Truth Compiler / Runtime Speaker (Person A 主担当)
packages/shared/     # 共有型 / zod schema / callable 契約
firestore.rules      # Firestore セキュリティルール
firebase.json        # Hosting / Functions / Firestore / Emulator 設定
.firebaserc          # Firebase プロジェクト ID
tasks/               # GitHub Issue 同期用タスクファイル
scripts/             # sync-tasks.mjs ほか
要件定義書/          # 仕様書と実装計画
docs/                # セットアップ・テスト・プレイ手順
```

## ローカル起動手順 (概要)

詳細な手順は **[docs/dev-setup.md](docs/dev-setup.md)** を参照してください。

### 前提ツール

- Node.js 22.13+ (`engines` は `>=20`。22 系を推奨)
- pnpm 11.5 (`npm install -g pnpm`)
- Java 21+ (Firestore Emulator の起動に必須)
- Firebase CLI (`npm install -g firebase-tools`)

### 起動

```powershell
pnpm install

# ターミナル 1: Firebase Emulator (Auth/Firestore/Functions)
firebase emulators:start --only auth,firestore,functions

# ターミナル 2: Next.js dev server
pnpm --filter @village/web dev
# → http://localhost:3000        (アプリ)
# → http://localhost:4000        (Firebase Emulator UI)
```

`apps/web/.env.local` の `NEXT_PUBLIC_USE_EMULATOR=true` で Emulator に接続します。LLM を使う真相生成には Gemini API キーが必要です (設定方法は [docs/dev-setup.md](docs/dev-setup.md))。

## テスト

```powershell
# Functions ユニットテスト (Jest)
pnpm --filter @village/functions test

# Firestore セキュリティルールのテスト (要 Java 21 / Emulator)
pnpm --filter @village/functions test:rules

# Emulator 上で全テスト実行 (CI 相当)
pnpm --filter @village/functions test:ci

# 全パッケージの型チェック / Lint / 整形
pnpm typecheck
pnpm lint
pnpm format
```

Mock → Emulator → 本番の疎通検証手順は [docs/integration-test.md](docs/integration-test.md) を参照。

## デプロイ

- **本番 URL**: (デプロイ後に記載)
- Firebase プロジェクト: `aihackathon-8b383` (`.firebaserc`)
- 外部サービス側の手動セットアップ (Console / Secret Manager / GitHub) は [docs/setup-manual.md](docs/setup-manual.md) を参照。

## デモ動画

- (提出前に記載)

## 担当分担

- **Person A**: Truth Compiler、Runtime Speaker、Cloud Functions、Firestore rules、LLM プロンプト
- **Person B**: Next.js 全画面、Zustand、Firebase クライアント SDK、Anonymous Auth、デプロイ
- **共同**: `packages/shared`、Firestore コレクション設計、Phase 5 のバランス調整

## ライセンス

MIT License。詳細は [LICENSE](LICENSE) を参照。
