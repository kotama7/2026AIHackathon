'use client';

import type { GameStatus } from '@village/shared';

const KEY = 'aiVillageTrial.recentGames.v1';
const MAX = 5;

export type RecentGame = {
  gameId: string;
  /** ISO 8601 文字列 */
  createdAt: string;
  status: GameStatus;
  /** 任意のラベル (シードゲームかどうかなど) */
  label?: string;
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function listRecentGames(): RecentGame[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is RecentGame =>
        typeof x === 'object' && x !== null && 'gameId' in x && 'createdAt' in x,
    );
  } catch {
    return [];
  }
}

export function pushRecentGame(game: RecentGame): RecentGame[] {
  if (!isBrowser()) return [];
  const existing = listRecentGames().filter((g) => g.gameId !== game.gameId);
  const next = [game, ...existing].slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // quota exceeded などは無視
  }
  return next;
}

export function updateRecentGameStatus(gameId: string, status: GameStatus): void {
  if (!isBrowser()) return;
  const existing = listRecentGames();
  const next = existing.map((g) => (g.gameId === gameId ? { ...g, status } : g));
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}
