# Mock → Real Functions 統合検証手順 (B2-09)

最終更新: B2-09 ブランチ。A の Phase 2 (Truth Compiler, A2-01..A2-13) と B の Phase 1..4 を疎通確認するための手順。

## モード

クライアントは `apps/web/src/lib/mode.ts` で 3 モードに分岐する。ヘッダー右上の **MODE バッジ** で常時確認できる。

| Mode       | 設定                            | Functions 呼び出し             | Firestore listener                    |
| ---------- | ------------------------------- | ------------------------------ | ------------------------------------- |
| `MOCK`     | `NEXT_PUBLIC_USE_MOCK=true`     | `functionsMock` のフィクスチャ | no-op                                 |
| `EMULATOR` | `NEXT_PUBLIC_USE_EMULATOR=true` | 実コード → localhost emulator  | onSnapshot で localhost emulator 購読 |
| `PROD`     | 上記いずれも false              | 実コード → 本番 Firebase       | onSnapshot で本番 Firebase 購読       |

## 1. 前提

- Java 21+ がインストール済み (Firestore emulator のテストや A1-07 rules テストで必要)
- Firebase CLI が `firebase` コマンドで使える
- ルートで `pnpm install --ignore-scripts` 済み (`allowBuilds` プレースホルダ未対応のため `--ignore-scripts` が必須)
- `apps/web/.env.local` に本物の `NEXT_PUBLIC_FIREBASE_*` が設定済み

## 2. EMULATOR モード (推奨)

ローカル完結。本番に影響を出さず Functions の挙動を確認できる。

### 2-1. Functions ビルド

```bash
pnpm --filter @village/functions build
```

### 2-2. Emulator 起動

別ターミナルで:

```bash
firebase emulators:start --only functions,firestore,auth
```

- Auth: http://127.0.0.1:9099
- Firestore: http://127.0.0.1:8080
- Functions: http://127.0.0.1:5001
- Emulator UI: http://127.0.0.1:4000

### 2-3. Web を emulator モードで起動

別ターミナルで:

```bash
NEXT_PUBLIC_USE_MOCK=false NEXT_PUBLIC_USE_EMULATOR=true pnpm --filter @village/web dev
```

`http://localhost:3000` を開き、ヘッダーバッジが青の **EMULATOR** になっていることを確認。

### 2-4. 動作確認 (E2E ハッピーパス)

現状 Phase 2 までしか A 側が実装済みでないので、以下のフローのみ通る:

- [ ] タイトル画面が表示される、`MODE` バッジが `EMULATOR`
- [ ] 「新規ゲームを開始」→ ローディング演出 (60s 推定) → `/play/{gameId}` に遷移
  - 注: Truth Compiler は実 LLM を呼ぶので Gemini API キー (`GEMINI_API_KEY`) が secrets に設定されていないと `truth_compiler_failure` で落ちる。シードゲームで起動する場合は「シードゲームで開始」リンクから
- [ ] 村概要画面で 6 人のキャラが表示される (固定真相は LLM 生成で毎回違う)
- [ ] 各キャラカードをクリック → プロフィールモーダル
- [ ] 議論ログタブ: Day1 の初期 5 件のプレースホルダログが見える (A3-01 未実装のため日本語の定型文)
- [ ] 証拠タブ: Day1 の証拠 3 件
- [ ] ピン留め: 発言・証拠をピン留め → Firestore Emulator UI で `users/.../pins/` に書き込まれていることを確認

### 2-5. 既知の制約 (Phase 3+ A 未実装)

以下を叩くと `functions/not-found` に近いエラーが出るのは仕様 (A の Phase 3/4 待ち):

- 尋問 (`callSubmitInterrogation`): A3-08 待ち
- 裁判 (`callSubmitTrialDecision`): A4-05 待ち
- 夜行動 (`callSubmitNightAction`): A3-09 待ち
- 真相開示 (`callRevealTruth`): A4-06 待ち

エラーは `lib/functionsErrorMessages.ts` で日本語化されて表示される。アプリは ErrorBoundary で落ちないこと。

## 3. PROD モード (本番デプロイ後)

`firebase deploy --only functions,firestore:rules` で本番にデプロイした後:

```bash
NEXT_PUBLIC_USE_MOCK=false NEXT_PUBLIC_USE_EMULATOR=false pnpm --filter @village/web dev
```

`MODE` バッジが赤の **PROD** になる。EMULATOR と同じフローで確認。

注意: 本番の Truth Compiler を回すと Gemini API の課金対象になるので、検証は emulator 優先。

## 4. mock とのデータ shape 互換チェック

PR #87 までで B が想定する shape と、A の Functions 実装 (`functions/src/db/admin.ts`, `functions/src/functions/startNewGame.ts`) で確認済み:

| 項目             | B が期待                                    | A の実装                  | 整合性                                 |
| ---------------- | ------------------------------------------- | ------------------------- | -------------------------------------- |
| meta path        | `users/{uid}/games/{gameId}/meta/state`     | 同じ                      | ✅ (本 PR で `meta/current` から修正)  |
| characters       | `users/.../characters/{charId}` doc         | 同じ                      | ✅                                     |
| evidence         | `users/.../evidence/{evidenceId}` doc       | 同じ                      | ✅                                     |
| publicLogs       | `users/.../publicLogs/{logId}` doc          | 同じ                      | ✅                                     |
| pins             | `users/.../pins/{pinId}` doc (client write) | rules で owner write 許可 | ✅                                     |
| interrogations   | `users/.../interrogations/{id}` doc         | 同じ                      | ✅ (A 側未実装)                        |
| trials           | `users/.../trials/day{day}` doc             | 同じ                      | ✅ (本 PR で `trial-day-{N}` から修正) |
| FUNCTIONS_REGION | `asia-northeast1`                           | `asia-northeast1`         | ✅                                     |

## 5. ロールバック

問題が起きた場合は `NEXT_PUBLIC_USE_MOCK=true` に戻せば即 MOCK モードに復帰する。Firestore に残った中途半端なデータは Emulator UI または `firebase firestore:delete --recursive` で消せる。
