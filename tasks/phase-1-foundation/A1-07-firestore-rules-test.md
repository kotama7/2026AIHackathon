---
id: A1-07
title: Firestore セキュリティルール emulator テスト
assignee: A
estimate_hours: 1.5
phase: 1
depends_on: [P0-06, A1-06]
labels: [firestore, ci]
---

## 概要

`@firebase/rules-unit-testing` で rules のホワイトボックステストを書く。所有者だけが read できること、`internal/` は全拒否であることを保証。

## 受け入れ条件

- [ ] `functions/test/rules/firestore.rules.test.ts`
- [ ] テストケース: 他人の game ドキュメントは read 不可
- [ ] テストケース: 自分の game ドキュメントは read 可、write 不可
- [ ] テストケース: 未ログインは全拒否
- [ ] テストケース: `internal/**` はログイン済みでも全拒否
- [ ] CI で実行される

## 実装メモ

- `initializeTestEnvironment({ projectId, firestore: { rules: readFileSync(...) } })`
- assertSucceeds / assertFails で簡潔に
