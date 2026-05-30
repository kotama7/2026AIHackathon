# 手動セットアップ手順 (P0-01 / P0-08)

コード化できない外部サービス側の設定。Phase 0 のリポジトリ scaffold が終わったら、二人で以下を順に実施する。

---

## 1. Firebase プロジェクト (P0-01)

プロジェクト `aihackathon-8b383` (dev) は作成済み。残りは Console で以下を有効化する。

### 1.1 Firestore を有効化

1. [Firebase Console](https://console.firebase.google.com/project/aihackathon-8b383/firestore) → Firestore Database → 「データベースを作成」
2. ロケーション: `asia-northeast1 (東京)`
3. モード: **本番モード** で開始 (rules は本リポジトリの `firestore.rules` を後でデプロイ)
4. デプロイ:
   ```powershell
   pnpm dlx firebase-tools deploy --only firestore:rules,firestore:indexes
   ```

### 1.2 Authentication を有効化

1. [Console → Authentication](https://console.firebase.google.com/project/aihackathon-8b383/authentication/providers)
2. 「始める」→ Sign-in method タブ
3. **匿名 (Anonymous)** プロバイダを有効化

### 1.3 Cloud Functions を有効化 (Blaze プラン必須)

1. [Console → Functions](https://console.firebase.google.com/project/aihackathon-8b383/functions) → 「使ってみる」
2. プロジェクトを **Blaze (従量制)** にアップグレード — 無料枠内では課金されないが必須
3. 関数のデフォルトリージョンは `asia-northeast1` (コードで指定済み)

### 1.4 Firebase AI Logic (Gemini) を有効化

1. [Console → Build → AI Logic](https://console.firebase.google.com/project/aihackathon-8b383/ailogic)
2. 「使ってみる」→ Gemini API を選択 (Vertex AI ではなく Gemini Developer API でよい、無料枠あり)
3. **API キーを取得** (Cloud Functions から呼ぶ用):
   - [Google AI Studio](https://aistudio.google.com/apikey) → 「Create API key」
   - 既存の Firebase プロジェクト `aihackathon-8b383` を選択
4. **Secret Manager に保存**:
   ```powershell
   pnpm dlx firebase-tools functions:secrets:set GEMINI_API_KEY
   # プロンプトでキーを貼り付け
   ```

### 1.5 prod プロジェクト (任意、デモ直前で OK)

本番用に別プロジェクト `aihackathon-8b383-prod` (or similar) を作る場合:

1. Console で新規プロジェクト作成 → 上記 1.1〜1.4 を繰り返し
2. `.firebaserc` に `"prod": "..."` を追加
3. `firebase use prod` で切り替え

---

## 2. GitHub リポジトリ設定 (P0-08)

リポジトリ: https://github.com/kotama7/2026AIHackathon

### 2.1 main ブランチ保護

1. Settings → Branches → Add branch ruleset (or Add classic branch protection rule)
2. Branch name pattern: `main`
3. 有効化:
   - ✅ Require a pull request before merging
   - ✅ Require approvals: 1
   - ✅ Require status checks to pass
     - 必須 checks: `Lint`, `Format check`, `Typecheck`, `Build` (CI workflow から)
   - ✅ Require branches to be up to date before merging
   - ✅ Block force pushes

### 2.2 Variables (Issue assignee 自動付与用)

Settings → Secrets and variables → Actions → Variables タブ:

| Name            | Value                       |
| --------------- | --------------------------- |
| `GITHUB_USER_A` | Person A の GitHub username |
| `GITHUB_USER_B` | Person B の GitHub username |

### 2.3 Secrets (デプロイ用、Phase 5 で必要)

Settings → Secrets and variables → Actions → Secrets タブ:

| Name                                         | 取得方法                                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `FIREBASE_SERVICE_ACCOUNT_AIHACKATHON_8B383` | Firebase Console → プロジェクト設定 → サービスアカウント → 新しい秘密鍵を生成 (JSON 全文) |

### 2.4 Issues / Projects 設定

1. Settings → General → Features → ✅ Issues 有効
2. リポジトリのトップ → Projects → New project → "AI村裁判 開発"
   - Template: Board (kanban)
   - Workflows → "Auto-add to project" を有効化、フィルタ: `is:issue label:phase-0,phase-1,phase-2,phase-3,phase-4,phase-5`
3. カスタムフィールド追加:
   - `Estimate (h)`: Number
   - `Phase`: Single select (Phase 0 〜 Phase 5)

### 2.5 タスクを Issue に同期

P0-08 の Variables 設定後、ローカルから初回同期:

```powershell
gh auth login   # 未認証なら
$env:GITHUB_USER_A = "person-a-username"
$env:GITHUB_USER_B = "person-b-username"
$env:GITHUB_REPOSITORY = "kotama7/2026AIHackathon"
node scripts/sync-tasks.mjs --dry-run   # 差分確認
node scripts/sync-tasks.mjs             # 実同期 (81 Issue 作成)
```

以降は `main` への push で自動同期される (`.github/workflows/sync-tasks.yml`)。

---

## 3. ローカル開発環境セットアップ

二人とも以下を実施:

```powershell
# Node 20 が必要
node --version   # v20.x or later (22 でも動くが engine warning 出る)

# pnpm
npm install -g pnpm
pnpm --version   # 11.x

# Firebase CLI
npm install -g firebase-tools
firebase --version
firebase login

# リポジトリ
git clone https://github.com/kotama7/2026AIHackathon.git
cd 2026AIHackathon
pnpm install

# 環境変数
cp apps/web/.env.local.example apps/web/.env.local
# .env.local を編集 (Firebase Console → プロジェクト設定 → マイアプリ から値を取得)

# 動作確認
pnpm typecheck   # 全パッケージ通過すること
pnpm build       # 全パッケージ通過すること
pnpm lint        # 0 errors / 0 warnings
```

### Emulator 起動 (開発時)

```powershell
firebase emulators:start --only auth,firestore,functions
# 別ターミナルで
pnpm --filter @village/web dev
# → http://localhost:3000 で Next.js dev server
# → http://localhost:4000 で Firebase Emulator UI
```

`.env.local` の `NEXT_PUBLIC_USE_EMULATOR=true` で local emulator に接続される。

---

## 4. チェックリスト

P0-01:

- [ ] Firestore (asia-northeast1) 有効
- [ ] Anonymous Auth 有効
- [ ] Cloud Functions 有効 (Blaze プラン)
- [ ] Gemini API キーを Secret Manager に登録
- [ ] `firebase deploy --only firestore:rules` 通過

P0-08:

- [ ] main ブランチ保護
- [ ] Variables `GITHUB_USER_A` / `GITHUB_USER_B` 設定
- [ ] Project "AI村裁判 開発" 作成
- [ ] `node scripts/sync-tasks.mjs` で 81 Issue 作成
