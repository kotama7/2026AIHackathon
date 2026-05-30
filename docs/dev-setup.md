# 開発環境構築ガイド (dev-setup)

AI村裁判をローカルで開発・実行するための手順です。外部サービス側 (Firebase Console / Secret Manager / GitHub) の **一度きりの手動設定** は [docs/setup-manual.md](setup-manual.md) にまとめてあるため、本ドキュメントでは重複させず、日々の開発で必要な手元のセットアップに絞ります。

関連: [README](../README.md) / [手動セットアップ (Console/GitHub)](setup-manual.md) / [統合テスト手順](integration-test.md) / [プレイガイド](play-guide.md)

---

## 1. 前提ツール

| ツール       | バージョン | 備考                                                           |
| ------------ | ---------- | -------------------------------------------------------------- |
| Node.js      | 22.13+     | `engines` は `>=20`。22 系推奨 (20 系は engine warning が出る) |
| pnpm         | 11.5       | `npm install -g pnpm`                                          |
| Java (JDK)   | 21+        | **Firestore Emulator / rules テストに必須**                    |
| Firebase CLI | 15+        | `npm install -g firebase-tools`                                |

確認コマンド:

```powershell
node --version       # v22.13 以上が望ましい
pnpm --version       # 11.5.x
java --version       # 21 以上 (Windows: winget install Microsoft.OpenJDK.21)
firebase --version   # 15.x 以上
firebase login
```

---

## 2. リポジトリ取得 & 依存インストール

```powershell
git clone https://github.com/kotama7/2026AIHackathon.git
cd 2026AIHackathon
pnpm install
```

インストール後の動作確認:

```powershell
pnpm typecheck   # 全パッケージの TS 型チェックが通ること
pnpm build       # 全パッケージのビルドが通ること
pnpm lint        # 0 errors / 0 warnings
```

> 補足: `pnpm-workspace.yaml` の `allowBuilds` でネイティブビルド (esbuild / sharp ほか) を明示許可済みのため、通常は `pnpm install` のみで問題ありません。

---

## 3. Firebase プロジェクト設定

`.firebaserc` に開発用プロジェクト `aihackathon-8b383` が登録済みです。

```jsonc
// .firebaserc
{
  "projects": { "default": "aihackathon-8b383", "dev": "aihackathon-8b383" },
}
```

別プロジェクト (本番用など) を使う場合は `.firebaserc` に追記し、`firebase use <alias>` で切り替えます。Console 側の Firestore / Auth / Functions / AI Logic の有効化手順は [docs/setup-manual.md](setup-manual.md) を参照してください。

### 3.1 フロントエンド環境変数

```powershell
copy apps\web\.env.local.example apps\web\.env.local
```

`apps/web/.env.local` を編集し、Firebase Console → プロジェクト設定 → マイアプリ から取得した `NEXT_PUBLIC_FIREBASE_*` を設定します。Emulator で開発する場合は `NEXT_PUBLIC_USE_EMULATOR=true` を指定します (モード詳細は [integration-test.md](integration-test.md))。

### 3.2 Gemini API キー (LLM 真相生成)

Truth Compiler / Runtime Speaker は Gemini を呼ぶため API キーが必要です。

- **Emulator (ローカル) 用**: `functions/.secret.local` に以下を記述します (このファイルはコミットしないこと)。

  ```dotenv
  GEMINI_API_KEY=＜AI Studio で発行したキー＞
  ```

  キーは [Google AI Studio](https://aistudio.google.com/apikey) で発行します。

- **本番用**: Secret Manager に登録します。

  ```powershell
  firebase functions:secrets:set GEMINI_API_KEY
  # プロンプトでキーを貼り付け
  ```

> API キーが未設定でも Emulator は起動しますが、真相生成 (`startNewGame`) は `truth_compiler_failure` で失敗します。LLM を呼ばずに動作確認したい場合は、UI の「シードゲームで開始」を利用してください ([integration-test.md](integration-test.md) 参照)。

---

## 4. Emulator 起動

初回のみ、Next.js を Hosting で扱うための web frameworks experiment を有効化します。

```powershell
firebase experiments:enable webframeworks
```

Emulator を起動します (ポートは `firebase.json` 定義)。

```powershell
firebase emulators:start --only auth,firestore,functions
```

| Emulator    | ポート | URL                   |
| ----------- | ------ | --------------------- |
| Auth        | 9099   | http://127.0.0.1:9099 |
| Firestore   | 8080   | http://127.0.0.1:8080 |
| Functions   | 5001   | http://127.0.0.1:5001 |
| Hosting     | 5000   | http://127.0.0.1:5000 |
| Emulator UI | 4000   | http://127.0.0.1:4000 |

Functions のコードを変更したら、別ターミナルでビルドし直します:

```powershell
pnpm --filter @village/functions build
```

---

## 5. フロントエンド開発サーバ

別ターミナルで Next.js dev server を起動します (`apps/web` の `dev` スクリプト = `next dev`)。

```powershell
pnpm --filter @village/web dev
# → http://localhost:3000
```

`apps/web/.env.local` の `NEXT_PUBLIC_USE_EMULATOR=true` で手順 4 の Emulator に接続されます。MOCK / EMULATOR / PROD の各モードの切り替えは [docs/integration-test.md](integration-test.md) を参照してください。

---

## 6. テスト

Functions パッケージ (`functions/package.json`) のスクリプトを利用します。

```powershell
# ユニットテスト (Jest)
pnpm --filter @village/functions test

# Firestore セキュリティルールのテスト (要 Java 21)
pnpm --filter @village/functions test:rules

# Truth Compiler の E2E テスト
pnpm --filter @village/functions test:e2e:truth-compiler

# Emulator (firestore/auth) を起動して全テスト実行 = CI 相当
pnpm --filter @village/functions test:ci
```

リポジトリ全体の品質チェック:

```powershell
pnpm typecheck   # 全パッケージ型チェック
pnpm lint        # ESLint (flat config)
pnpm format      # Prettier 整形
```

---

## 7. よく使うコマンド早見表

| 目的                   | コマンド                                                   |
| ---------------------- | ---------------------------------------------------------- |
| 依存インストール       | `pnpm install`                                             |
| Functions ビルド       | `pnpm --filter @village/functions build`                   |
| Emulator 起動          | `firebase emulators:start --only auth,firestore,functions` |
| フロント dev           | `pnpm --filter @village/web dev`                           |
| Functions テスト       | `pnpm --filter @village/functions test`                    |
| ルールテスト           | `pnpm --filter @village/functions test:rules`              |
| Functions デプロイ     | `pnpm --filter @village/functions deploy`                  |
| 全パッケージ型チェック | `pnpm typecheck`                                           |

外部サービス側の初期セットアップやデプロイ前の Console 設定は [docs/setup-manual.md](setup-manual.md) を参照してください。
