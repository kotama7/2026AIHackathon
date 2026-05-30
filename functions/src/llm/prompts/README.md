# Prompt templates

LLM プロンプトテンプレートの置き場所。Phase 1 では骨格のみ、Phase 2/3 で中身を埋める。

## 命名規約

各ファイルは `build{Role}Prompt(args): string` の単一関数を export する。
役割ごとにディレクトリを切る:

- `generator/` — 真相生成 (Phase 2)
- `validator/` — LLM judge 検証 (Phase 2)
- `repairer/` — 検証失敗の修正 (Phase 2)
- `speaker/` — Runtime での発言生成 (Phase 3-4)

## プロンプト構造

すべてのプロンプトは次の 4 セクションを統一して持つ:

```
## ロール
あなたは {role} です。{背景説明}

## 入力
{コンテキスト・既知の事実・キャラ設定など}

## 出力形式
{JSON スキーマの説明 or 自然言語の構造}

## 制約
- {禁止事項}
- {遵守事項}
```

## 言語

プロンプトは日本語で書く。Gemini は日本語プロンプトでも JSON モードで安定して動作する。
