'use client';

import { useEffect, useState } from 'react';

import { callRevealTruth } from '@/lib/firebase/functions';
import { describeError } from '@/lib/functionsErrorMessages';
import { useGameStore } from '@/stores/gameStore';

/**
 * 真相 (RevealTruthResponse) を取得しストアにキャッシュする。
 *
 * - `enabled=false` の間は何もしない (ゲーム進行中に誤発火させない)
 * - `truthReveal` が既にあれば再 fetch しない
 * - 失敗時は describeError で日本語化したメッセージを保持
 */
export function useTruthReveal(gameId: string, enabled: boolean) {
  const truthReveal = useGameStore((s) => s.truthReveal);
  const setTruthReveal = useGameStore((s) => s.setTruthReveal);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || truthReveal !== null) return;
    let cancelled = false;
    setLoading(true);
    setErrorMessage(null);
    callRevealTruth({ gameId })
      .then((res) => {
        if (cancelled) return;
        setTruthReveal(res);
      })
      .catch((e) => {
        if (cancelled) return;
        setErrorMessage(describeError(e).user);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [gameId, enabled, truthReveal, setTruthReveal]);

  return { truthReveal, loading, errorMessage };
}
