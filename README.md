# AI村裁判 (2026 AI ハッカソン)

AI キャラクターで構成された人狼村を、プレイヤーが外部監査官として調査し、人狼を特定する一人用推理ゲーム。

- 仕様: [要件定義書/基礎情報.md](要件定義書/基礎情報.md)
- 実装計画: [要件定義書/実装計画.md](要件定義書/実装計画.md)
- タスク一覧: [tasks/INDEX.md](tasks/INDEX.md) (81 タスク / 173h / GitHub Issue 自動同期)

## 技術スタック

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + Zustand
- **Backend**: Firebase Cloud Functions (Node 20, TypeScript)
- **Database**: Firestore (Native mode, asia-northeast1)
- **Auth**: Firebase Anonymous Authentication
- **LLM**: Firebase AI Logic 経由の Gemini (無料枠)
- **Hosting**: Firebase Hosting

## ディレクトリ構成 (pnpm monorepo)

```
apps/web/            # Next.js (Person B 主担当)
functions/           # Cloud Functions (Person A 主担当)
packages/shared/     # 共有型 / zod schema / callable 契約
firestore.rules
firebase.json
tasks/               # GitHub Issue 同期用タスクファイル
scripts/             # sync-tasks.mjs ほか
.github/             # CI / sync-tasks workflow / PR template
要件定義書/          # 仕様書と実装計画
docs/                # セットアップ手順など
```

## ローカル開発

詳細は [docs/setup-manual.md](docs/setup-manual.md) を参照。

```powershell
pnpm install
pnpm typecheck    # 全パッケージ TS 型チェック
pnpm lint         # ESLint (flat config)
pnpm format       # Prettier 整形
pnpm build        # 全パッケージビルド

# Next.js dev server
pnpm --filter @village/web dev

# Firebase emulator
firebase emulators:start --only auth,firestore,functions
```

## 担当分担

- **Person A**: Truth Compiler、Runtime Speaker、Cloud Functions、Firestore rules、LLM プロンプト
- **Person B**: Next.js 全画面、Zustand、Firebase クライアント SDK、Anonymous Auth、デプロイ
- **共同**: `packages/shared`、Firestore コレクション設計、Phase 5 のバランス調整

## ライセンス

[LICENSE](LICENSE) を参照。
