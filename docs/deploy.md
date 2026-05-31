# デプロイ手順 (P5-06)

Firebase Hosting (Next.js SSR / webframeworks) + Cloud Functions のデプロイ。
当面は **dev プロジェクト `aihackathon-8b383`** に出す。

CI ワークフロー: `.github/workflows/deploy.yml`

- **main マージ** → live channel に hosting + functions をフルデプロイ
- **PR** → preview channel (`pr-<番号>`, 7日で失効) にデプロイし URL を PR にコメント
- CI は **Linux** で動くため、ローカル Windows 固有の `node-which` 問題は発生しない

## pnpm モノレポ対応で入れてある工夫

`workspace:*` 依存は Firebase のクラウド npm が解決できない (`EUNSUPPORTEDPROTOCOL`)。そのため:

- **functions**: `esbuild.config.mjs` で `@village/shared` を inline 化バンドル。`package.json` から workspace 依存を除去、`.npmrc` に `legacy-peer-deps=true`。
- **web**: `@village/shared` を `package.json` から外し、`next.config.mjs` の webpack alias + `experimental.externalDir` + `extensionAlias` で解決。`images.unoptimized: true` で sharp を除外 (クロスプラットフォーム lockfile 問題の回避)。

## 手動セットアップ (CI で必須)

### 1. GEMINI_API_KEY を Secret Manager に登録（済）

```powershell
"<KEY>" | firebase functions:secrets:set GEMINI_API_KEY --project aihackathon-8b383 --data-file -
```

キーは無料枠プロジェクト `aihackathonapi` 発行のものを使用 (課金回避)。モデルは `gemini-2.5-flash`。

### 2. GitHub Actions シークレット `FIREBASE_SERVICE_ACCOUNT_AIHACKATHON_8B383`

Firebase コンソールでサービスアカウント秘密鍵 (JSON) を発行し、GitHub に登録する:

1. [Firebase Console → プロジェクト設定 → サービスアカウント](https://console.firebase.google.com/project/aihackathon-8b383/settings/serviceaccounts/adminsdk) → 「新しい秘密鍵を生成」→ JSON をダウンロード
2. CLI で登録 (要 `gh auth login`):
   ```powershell
   gh secret set FIREBASE_SERVICE_ACCOUNT_AIHACKATHON_8B383 --repo kotama7/2026AIHackathon < path\to\key.json
   ```
   またはコンソール: Settings → Secrets and variables → Actions → New repository secret に JSON 全文を貼り付け。

> SA には Firebase Hosting 管理者 / Cloud Functions 管理者 / Cloud Run 管理者 / サービスアカウントユーザー 相当のロールが必要。Admin SDK の SA で概ね足りる。

## ローカルからの手動デプロイ

```powershell
firebase experiments:enable webframeworks   # 初回のみ
pnpm build
firebase deploy --only functions --project aihackathon-8b383            # functions のみ
firebase deploy --only hosting,functions --project aihackathon-8b383    # フル
```

> ⚠️ Windows ローカルの hosting デプロイは webframeworks の esbuild 検出 (`node-which`) で不安定。
> hosting は CI(Linux) 経由を推奨。

## チェックリスト

- [x] Blaze プラン / Functions 有効
- [x] `GEMINI_API_KEY` を Secret Manager に登録
- [ ] GitHub シークレット `FIREBASE_SERVICE_ACCOUNT_AIHACKATHON_8B383` 登録
- [x] functions を本番デプロイ (ping / startNewGame)
- [ ] hosting を本番デプロイ (CI 経由推奨)
- [ ] 本番 URL で タイトル→新規ゲーム→完走 (Phase 3/4 完成後)
