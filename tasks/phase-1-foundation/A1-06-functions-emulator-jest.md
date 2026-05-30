---
id: A1-06
title: Functions emulator + Jest セットアップ
assignee: A
estimate_hours: 2
phase: 1
depends_on: [P0-02]
labels: [functions, ci]
---

## 概要
Firebase Emulator Suite (Functions + Firestore + Auth) のローカル起動と、Jest によるテスト基盤を整備。

## 受け入れ条件
- [ ] `firebase.json` に emulators 設定: functions / firestore / auth ポート
- [ ] `pnpm --filter functions emulators` で起動
- [ ] `functions/` に Jest 設定 (`jest.config.cjs`)、TS preset
- [ ] サンプルテスト 1 本 (ping callable) が pass
- [ ] CI でも emulator + jest が走る (`firebase emulators:exec`)

## 実装メモ
- `firebase-functions-test` を使うか、emulator + supertest 風に呼び出すか選ぶ。後者の方が本物に近い
- ポート: functions 5001, firestore 8080, auth 9099 (defaults)
