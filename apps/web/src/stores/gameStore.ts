'use client';

import type {
  CharacterPublic,
  DialogueLog,
  EvidencePublic,
  GameId,
  GameMeta,
  InterrogationAction,
  Pin,
  RevealTruthResponse,
  TrialDecision,
} from '@village/shared';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

/** クライアントから見える尋問アクション。truthStatus (内部判定) は除外 */
export type InterrogationPublic = Omit<InterrogationAction, 'truthStatus'>;

/** プレイヤーが裁判フェーズ用に作成した矛盾候補 (複数ピンの束 + メモ) */
export type ContradictionDraft = {
  id: string;
  /** 関連するピン ID 群 */
  pinIds: string[];
  /** プレイヤーのメモ */
  note: string;
  createdAtMs: number;
};

/** 裁判記録 (Firestore TrialDecision + outcome 拡張) */
export type ClientTrialDecision = TrialDecision & {
  id: string;
  outcome: 'continue' | 'won' | 'lost';
};

type GameState = {
  gameId: GameId | null;
  meta: GameMeta | null;
  characters: CharacterPublic[];
  evidence: EvidencePublic[];
  logs: DialogueLog[];
  pins: Pin[];
  interrogations: InterrogationPublic[];
  contradictions: ContradictionDraft[];
  trials: ClientTrialDecision[];
  /** ゲーム終了後に callRevealTruth で取得した真相。null=未取得 */
  truthReveal: RevealTruthResponse | null;
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
  setInterrogations: (interrogations: InterrogationPublic[]) => void;
  addInterrogation: (interrogation: InterrogationPublic) => void;
  setContradictions: (contradictions: ContradictionDraft[]) => void;
  addContradiction: (contradiction: ContradictionDraft) => void;
  removeContradiction: (id: string) => void;
  setTrials: (trials: ClientTrialDecision[]) => void;
  addTrial: (trial: ClientTrialDecision) => void;
  setTruthReveal: (truth: RevealTruthResponse | null) => void;
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
  interrogations: [],
  contradictions: [],
  trials: [],
  truthReveal: null,
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

      setInterrogations: (interrogations) => set({ interrogations }, false, 'setInterrogations'),
      addInterrogation: (intr) =>
        set(
          (state) => ({
            interrogations: state.interrogations.some((i) => i.id === intr.id)
              ? state.interrogations
              : [...state.interrogations, intr],
          }),
          false,
          'addInterrogation'
        ),

      setContradictions: (contradictions) => set({ contradictions }, false, 'setContradictions'),
      addContradiction: (c) =>
        set(
          (state) => ({
            contradictions: state.contradictions.some((x) => x.id === c.id)
              ? state.contradictions
              : [...state.contradictions, c],
          }),
          false,
          'addContradiction'
        ),
      removeContradiction: (id) =>
        set(
          (state) => ({
            contradictions: state.contradictions.filter((x) => x.id !== id),
          }),
          false,
          'removeContradiction'
        ),

      setTrials: (trials) =>
        set(
          (state) => ({
            // listener 経由で trial が来ても、ローカルで保持している outcome を保存する
            trials: trials.map((t) => {
              const existing = state.trials.find((x) => x.id === t.id);
              return existing ? { ...t, outcome: existing.outcome } : t;
            }),
          }),
          false,
          'setTrials'
        ),
      addTrial: (trial) =>
        set(
          (state) => ({
            // submit 直後は新しい outcome 込みで上書きする (id 一意 = day 単位)
            trials: state.trials.some((t) => t.id === trial.id)
              ? state.trials.map((t) => (t.id === trial.id ? trial : t))
              : [...state.trials, trial],
          }),
          false,
          'addTrial'
        ),
      setTruthReveal: (truth) => set({ truthReveal: truth }, false, 'setTruthReveal'),

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

/** 特定キャラ宛の尋問履歴 */
export function useInterrogationsFor(targetId: string | null): InterrogationPublic[] {
  return useGameStore(
    useShallow((state) =>
      targetId
        ? state.interrogations
            .filter((i) => i.targetId === targetId)
            .slice()
            .sort((a, b) => a.day - b.day || a.createdAt.toMillis() - b.createdAt.toMillis())
        : []
    )
  );
}
