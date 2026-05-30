'use client';

import type {
  CharacterPublic,
  DialogueLog,
  EvidencePublic,
  GameId,
  GameMeta,
  Pin,
} from '@village/shared';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

type GameState = {
  gameId: GameId | null;
  meta: GameMeta | null;
  characters: CharacterPublic[];
  evidence: EvidencePublic[];
  logs: DialogueLog[];
  pins: Pin[];
};

type GameActions = {
  setGameId: (gameId: GameId | null) => void;
  setMeta: (meta: GameMeta | null) => void;
  setCharacters: (characters: CharacterPublic[]) => void;
  setEvidence: (evidence: EvidencePublic[]) => void;
  addEvidence: (evidence: EvidencePublic) => void;
  setLogs: (logs: DialogueLog[]) => void;
  addLog: (log: DialogueLog) => void;
  setPins: (pins: Pin[]) => void;
  addPin: (pin: Pin) => void;
  removePin: (pinId: string) => void;
  reset: () => void;
};

type Store = GameState & GameActions;

const initialState: GameState = {
  gameId: null,
  meta: null,
  characters: [],
  evidence: [],
  logs: [],
  pins: [],
};

export const useGameStore = create<Store>()(
  devtools(
    (set) => ({
      ...initialState,

      setGameId: (gameId) => set({ gameId }, false, 'setGameId'),
      setMeta: (meta) => set({ meta }, false, 'setMeta'),
      setCharacters: (characters) => set({ characters }, false, 'setCharacters'),

      setEvidence: (evidence) => set({ evidence }, false, 'setEvidence'),
      addEvidence: (ev) =>
        set(
          (state) => ({
            evidence: state.evidence.some((e) => e.id === ev.id)
              ? state.evidence
              : [...state.evidence, ev],
          }),
          false,
          'addEvidence'
        ),

      setLogs: (logs) => set({ logs }, false, 'setLogs'),
      addLog: (log) =>
        set(
          (state) => ({
            logs: state.logs.some((l) => l.id === log.id) ? state.logs : [...state.logs, log],
          }),
          false,
          'addLog'
        ),

      setPins: (pins) => set({ pins }, false, 'setPins'),
      addPin: (pin) =>
        set(
          (state) => ({
            pins: state.pins.some((p) => p.id === pin.id) ? state.pins : [...state.pins, pin],
          }),
          false,
          'addPin'
        ),
      removePin: (pinId) =>
        set(
          (state) => ({
            pins: state.pins.filter((p) => p.id !== pinId),
          }),
          false,
          'removePin'
        ),

      reset: () => set({ ...initialState }, false, 'reset'),
    }),
    {
      name: 'GameStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

/* ===== Selector helpers ===== */

/** 生存しているキャラのみを meta.aliveCharacters で絞り込み */
export function useAliveCharacters(): CharacterPublic[] {
  return useGameStore(
    useShallow((state) => {
      const aliveIds = new Set(state.meta?.aliveCharacters ?? []);
      return state.characters.filter((c) => aliveIds.has(c.id));
    })
  );
}

/** 当日の残り尋問ポイント */
export function useRemainingPoints(): number {
  return useGameStore((state) => state.meta?.remainingPoints ?? 0);
}

/** 現在の day / phase / status をまとめて取得 (再レンダー最適化) */
export function useGamePhaseInfo() {
  return useGameStore(
    useShallow((state) => ({
      day: state.meta?.currentDay ?? null,
      phase: state.meta?.currentPhase ?? null,
      status: state.meta?.status ?? null,
    }))
  );
}

/** ピン留め判定 (refType + refId) */
export function useIsPinned(refType: Pin['refType'], refId: string): boolean {
  return useGameStore((state) =>
    state.pins.some((p) => p.refType === refType && p.refId === refId)
  );
}

/** 特定 day のログのみ取得 */
export function useDayLogs(day: number): DialogueLog[] {
  return useGameStore(useShallow((state) => state.logs.filter((l) => l.day === day)));
}
