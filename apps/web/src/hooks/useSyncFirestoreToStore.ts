'use client';

import type { CharacterPublic, DialogueLog, EvidencePublic, GameMeta, Pin } from '@village/shared';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { useAuth } from '@/lib/firebase/auth';
import { getFirestore } from '@/lib/firebase/client';
import { useGameStore } from '@/stores/gameStore';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

type SyncState = {
  ready: boolean;
  error: Error | null;
};

/**
 * Firestore のリアルタイム購読と Zustand を同期するフック。
 *
 * - `gameId` が変わるたびに購読を張り直す。
 * - `NEXT_PUBLIC_USE_MOCK=true` の場合は Firestore を触らず、`setGameId` だけ行って no-op
 *   (mock モードでは callStartNewGame の戻り値で各 setter を直接叩く呼び出し側に委ねる)。
 * - 購読対象:
 *     users/{uid}/games/{gameId}/meta          (document)
 *     users/{uid}/games/{gameId}/characters    (collection)
 *     users/{uid}/games/{gameId}/evidence      (collection, day asc)
 *     users/{uid}/games/{gameId}/publicLogs    (collection, day asc → turn asc)
 *     users/{uid}/games/{gameId}/pins          (collection)
 */
export function useSyncFirestoreToStore(gameId: string | null): SyncState {
  const { uid } = useAuth();
  const setGameId = useGameStore((s) => s.setGameId);
  const setMeta = useGameStore((s) => s.setMeta);
  const setCharacters = useGameStore((s) => s.setCharacters);
  const setEvidence = useGameStore((s) => s.setEvidence);
  const setLogs = useGameStore((s) => s.setLogs);
  const setPins = useGameStore((s) => s.setPins);
  const reset = useGameStore((s) => s.reset);

  const [error, setError] = useState<Error | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!gameId) {
      reset();
      setReady(false);
      return;
    }
    setGameId(gameId);

    // モックモードでは callStartNewGame の戻り値で直接ストアを埋めるので listener は張らない
    if (USE_MOCK) {
      setReady(true);
      return;
    }

    if (!uid) {
      // Auth 未確立ならまだ subscribe しない (AuthProvider が解決するのを待つ)
      return;
    }

    const db = getFirestore();
    const gameBase = `users/${uid}/games/${gameId}`;
    const unsubs: Array<() => void> = [];

    const handleError = (e: unknown) => {
      const err = e instanceof Error ? e : new Error(String(e));

      console.error('[useSyncFirestoreToStore]', err);
      setError(err);
    };

    // meta
    unsubs.push(
      onSnapshot(
        doc(db, `${gameBase}/meta/current`),
        (snap) => {
          const data = snap.data() as GameMeta | undefined;
          if (data) setMeta(data);
        },
        handleError
      )
    );

    // characters
    unsubs.push(
      onSnapshot(
        collection(db, `${gameBase}/characters`),
        (snap) => {
          const chars = snap.docs.map((d) => d.data() as CharacterPublic);
          setCharacters(chars);
        },
        handleError
      )
    );

    // evidence (day asc)
    unsubs.push(
      onSnapshot(
        query(collection(db, `${gameBase}/evidence`), orderBy('day', 'asc')),
        (snap) => {
          const evs = snap.docs.map((d) => d.data() as EvidencePublic);
          setEvidence(evs);
        },
        handleError
      )
    );

    // logs (day asc → turn asc)
    unsubs.push(
      onSnapshot(
        query(
          collection(db, `${gameBase}/publicLogs`),
          orderBy('day', 'asc'),
          orderBy('turn', 'asc')
        ),
        (snap) => {
          const logs = snap.docs.map((d) => d.data() as DialogueLog);
          setLogs(logs);
        },
        handleError
      )
    );

    // pins
    unsubs.push(
      onSnapshot(
        collection(db, `${gameBase}/pins`),
        (snap) => {
          const pins = snap.docs.map((d) => d.data() as Pin);
          setPins(pins);
        },
        handleError
      )
    );

    setReady(true);
    setError(null);

    return () => {
      for (const u of unsubs) u();
      setReady(false);
    };
  }, [gameId, uid, setGameId, setMeta, setCharacters, setEvidence, setLogs, setPins, reset]);

  return { ready, error };
}
