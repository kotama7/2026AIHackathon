---
id: B2-08
title: Firestore real-time listener (meta / characters / logs / evidence)
assignee: B
estimate_hours: 1.5
phase: 2
depends_on: [B1-02, B1-04]
labels: [nextjs, firestore]
---

## 概要

`apps/web/src/hooks/useSyncFirestoreToStore.ts` で Firestore のリアルタイム購読を Zustand に流す。

## 受け入れ条件

- [ ] `useSyncFirestoreToStore(gameId)` を `/play/[gameId]/layout.tsx` で呼ぶ
- [ ] `meta` の onSnapshot、変更を `gameStore.setMeta`
- [ ] `characters/` の collection listener、`gameStore.setCharacters`
- [ ] `publicLogs/`、`evidence/` も同様
- [ ] アンマウント時に listener 解除
- [ ] エラー時は store の `error` field にセット

## 実装メモ

- 同時に複数 listener を張るので useEffect を分けるか集約するかは要設計
- Strict Mode の double mount 対策 (cleanup を確実に)
