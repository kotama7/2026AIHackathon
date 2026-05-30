'use client';

import type { Pin } from '@village/shared';
import { deleteDoc, doc, setDoc, Timestamp } from 'firebase/firestore';
import { useCallback } from 'react';

import { useAuth } from '@/lib/firebase/auth';
import { getFirestore } from '@/lib/firebase/client';
import { useGameStore } from '@/stores/gameStore';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

/** pin id を refType + refId から決定論的に生成 (idempotent) */
export function pinIdOf(refType: Pin['refType'], refId: string): string {
  return `${refType}-${refId}`;
}

/** ピン留めトグルと判定をまとめて提供。real mode では Firestore へ optimistic 書き込み */
export function usePinToggle() {
  const { uid } = useAuth();
  const gameId = useGameStore((s) => s.gameId);
  const pins = useGameStore((s) => s.pins);
  const addPin = useGameStore((s) => s.addPin);
  const removePin = useGameStore((s) => s.removePin);

  const isPinned = useCallback(
    (refType: Pin['refType'], refId: string) =>
      pins.some((p) => p.refType === refType && p.refId === refId),
    [pins]
  );

  const toggle = useCallback(
    (refType: Pin['refType'], refId: string, day: number) => {
      const id = pinIdOf(refType, refId);
      const already = pins.some((p) => p.id === id);

      if (already) {
        // optimistic remove
        removePin(id);
        if (!USE_MOCK && uid && gameId) {
          void deleteDoc(doc(getFirestore(), `users/${uid}/games/${gameId}/pins/${id}`)).catch(
            (e) => {
              // 失敗しても UI は緩く。次回 listener が真実を上書きする

              console.warn('[usePinToggle] delete failed', e);
            }
          );
        }
        return;
      }

      const now = new Date();
      const pin: Pin = {
        id,
        refType,
        refId,
        day,
        createdAt: {
          toDate: () => now,
          toMillis: () => now.getTime(),
          seconds: Math.floor(now.getTime() / 1000),
          nanoseconds: 0,
        },
      };
      // optimistic add
      addPin(pin);
      if (!USE_MOCK && uid && gameId) {
        void setDoc(doc(getFirestore(), `users/${uid}/games/${gameId}/pins/${id}`), {
          id,
          refType,
          refId,
          day,
          createdAt: Timestamp.fromDate(now),
        }).catch((e) => {
          console.warn('[usePinToggle] add failed', e);
        });
      }
    },
    [pins, addPin, removePin, uid, gameId]
  );

  return { isPinned, toggle };
}
