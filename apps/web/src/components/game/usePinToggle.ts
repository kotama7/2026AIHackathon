'use client';

import type { Pin } from '@village/shared';
import { useCallback } from 'react';

import { useGameStore } from '@/stores/gameStore';

/** pin id を refType + refId から決定論的に生成 (idempotent) */
export function pinIdOf(refType: Pin['refType'], refId: string): string {
  return `${refType}-${refId}`;
}

/** ピン留めトグルと判定をまとめて提供 */
export function usePinToggle() {
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
      if (pins.some((p) => p.id === id)) {
        removePin(id);
      } else {
        const now = new Date();
        addPin({
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
        });
      }
    },
    [pins, addPin, removePin]
  );

  return { isPinned, toggle };
}
