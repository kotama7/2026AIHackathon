'use client';

import { useEffect } from 'react';

import { useGameStore } from './gameStore';

/**
 * Firestore real-time listener とゲームストアを同期するフック。
 *
 * 実装は B2-08 (realtime-listeners) で行う。ここではシグネチャだけ確定し、
 * 呼び出し側 (B2-* で各画面が `useSyncFirestoreToStore(gameId)` する) のコードを先に書けるようにしている。
 *
 * 想定購読対象:
 *   - users/{uid}/games/{gameId}/meta
 *   - users/{uid}/games/{gameId}/characters
 *   - users/{uid}/games/{gameId}/evidence
 *   - users/{uid}/games/{gameId}/publicLogs
 *   - users/{uid}/games/{gameId}/pins
 *
 * 各 collection の onSnapshot を貼り、Pull したデータをそれぞれの setter で
 * ストアに書き戻す。unmount または gameId 変更で unsubscribe。
 */
export function useSyncFirestoreToStore(gameId: string | null) {
  const setGameId = useGameStore((s) => s.setGameId);
  const reset = useGameStore((s) => s.reset);

  useEffect(() => {
    if (!gameId) {
      reset();
      return;
    }

    setGameId(gameId);

    // TODO(B2-08): Firestore onSnapshot 購読を実装
    // - getFirestore() から meta / characters / evidence / publicLogs / pins を購読
    // - 各 setter で store を更新
    // - cleanup で unsubscribe

    return () => {
      // unsubscribe handlers
    };
  }, [gameId, setGameId, reset]);
}
