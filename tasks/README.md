# tasks/ — GitHub Issue 同期型タスク管理

このディレクトリは **1 ファイル = 1 GitHub Issue** として管理する。`main` ブランチに push されると GitHub Actions が走り、Issue を自動で作成・更新する。

---

## 1. ファイル命名規則

```
tasks/phase-{N}-{slug}/{担当}{フェーズ}-{連番}-{kebab-title}.md
```

担当プレフィックス:
- `P` = 両者共同 (Phase 0 / Phase 5 が中心)
- `A` = Person A (バックエンド / Functions / LLM / ゲームロジック)
- `B` = Person B (フロントエンド / UI / Firebase クライアント)

例:
- `tasks/phase-0-setup/P0-03-shared-types.md`
- `tasks/phase-1-foundation/A1-01-gemini-client.md`
- `tasks/phase-2-truth-compiler/B2-05-discussion-log-shell.md`

---

## 2. front-matter スキーマ

```yaml
---
id: A1-01                 # ユニーク。ファイル名のプレフィックスと一致させる
title: Gemini クライアントラッパー
assignee: A               # A | B | both
estimate_hours: 2         # 工数見積もり (人時)
phase: 1                  # 0..5
depends_on: [P0-02, P0-04] # 他タスクの id を列挙。空なら []
labels: [llm, functions]   # 追加ラベル (area)。phase/assignee ラベルは自動付与
---
```

`depends_on` に書いた ID の Issue が close されるまで、本タスクは "Blocked by #N" としてマークされる。

---

## 3. ファイル本文の推奨構成

```markdown
## 概要
何のタスクか 1〜3 行で。

## 受け入れ条件
- [ ] チェックボックスで列挙
- [ ] 客観的に検証可能な粒度で書く

## 実装メモ (任意)
- 触るファイル、参考リンク、設計上の注意点
```

---

## 4. 自動同期の仕組み

1. `tasks/**/*.md` に変更が入って `main` に push される
2. `.github/workflows/sync-tasks.yml` が走る
3. `scripts/sync-tasks.mjs` が全タスクファイルを読み込む
4. 各タスクについて:
   - title 内の `[ID]` で既存 Issue を検索
   - 無ければ作成、あればラベル/assignee/body を更新
5. 全 Issue 作成完了後、`depends_on` を Issue 番号に解決して body の **Blocked by** セクションを書き換える

冪等なので何度走っても安全。タスクファイルを消した場合は Issue を自動で close しない (誤削除防止のため手動)。

---

## 5. 必要な GitHub 設定

リポジトリの Settings:
- **General → Features → Issues**: 有効
- **Settings → Secrets and variables → Actions → Variables**:
  - `GITHUB_USER_A` = Person A の GitHub username
  - `GITHUB_USER_B` = Person B の GitHub username
- **Settings → General → Pull Requests**:
  - "Allow auto-merge" 有効化推奨
- **Branch protection (main)**:
  - PR 必須、approve 1 件以上、status check (CI) 通過必須

Projects (v2):
- リポジトリで Project "AI村裁判 開発" を作成
- Workflow: "Auto-add to project" を有効化、フィルタ `is:issue label:phase-0,phase-1,phase-2,phase-3,phase-4,phase-5`
- カスタムフィールド: `Phase` (single select), `Estimate (h)` (number), `Assignee` は GitHub assignee 連動

ラベル定義は `.github/labels.yml` で管理。`sync-tasks.mjs` 実行時に自動作成される。

---

## 6. ローカルでのドライラン

```bash
# 何が作成/更新されるかだけ確認 (Issue 操作なし)
node scripts/sync-tasks.mjs --dry-run

# 実際に同期 (gh CLI で認証済みの状態で)
node scripts/sync-tasks.mjs
```

---

## 7. 工数集計

```bash
node scripts/sync-tasks.mjs --summary
```

担当別 / フェーズ別の合計工数を表示する。

---

## 8. インデックス

全タスクの一覧と依存関係は [INDEX.md](./INDEX.md) を参照 (手動更新)。Mermaid 図あり。
