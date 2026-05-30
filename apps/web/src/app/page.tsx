'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { StartGameLoader } from '@/components/game/StartGameLoader';
import { Button } from '@/components/ui';
import { callStartNewGame } from '@/lib/firebase/functions';
import { listRecentGames, pushRecentGame, type RecentGame } from '@/lib/recentGames';
import { useGameStore } from '@/stores/gameStore';

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [recent, setRecent] = useState<RecentGame[]>([]);
  const autoStartedRef = useRef(false);

  const setGameId = useGameStore((s) => s.setGameId);
  const setMeta = useGameStore((s) => s.setMeta);
  const setCharacters = useGameStore((s) => s.setCharacters);
  const setEvidence = useGameStore((s) => s.setEvidence);
  const setLogs = useGameStore((s) => s.setLogs);
  const reset = useGameStore((s) => s.reset);

  useEffect(() => {
    setRecent(listRecentGames());
  }, [starting]);

  const startGame = useCallback(
    async (useSeed = false) => {
      setError(null);
      setStarting(true);
      reset();
      try {
        const res = await callStartNewGame({ useSeed });
        setGameId(res.gameId);
        setMeta(res.meta);
        setCharacters(res.characters);
        setEvidence(res.initialEvidence);
        setLogs(res.initialLogs);
        pushRecentGame({
          gameId: res.gameId,
          createdAt: new Date().toISOString(),
          status: res.meta.status,
          label: res.meta.isSeedGame ? 'seed' : undefined,
        });
        router.push(`/play/${res.gameId}`);
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        setStarting(false);
      }
    },
    [reset, setGameId, setMeta, setCharacters, setEvidence, setLogs, router]
  );

  // ?replay=1 で B4-04 経由の自動 restart
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (searchParams.get('replay') !== '1') return;
    autoStartedRef.current = true;
    // URL から replay を剥がす (リロードで再発火させない)
    router.replace('/', { scroll: false });
    void startGame(false);
  }, [searchParams, startGame, router]);

  return (
    <main className="flex min-h-screen items-center justify-center p-page">
      <div className="flex max-w-prose animate-fade-in flex-col items-center gap-section text-center">
        <div className="space-y-3">
          <h1 className="font-serif text-6xl font-bold tracking-display text-brand-gold">
            AI村裁判
          </h1>
          <p className="text-brand-muted">
            AIキャラクター同士の議論ログから人狼を特定する、一人用推理ゲーム
          </p>
        </div>

        <div className="flex flex-col items-center gap-card">
          <Button
            size="lg"
            onClick={() => startGame(false)}
            disabled={starting}
            className="min-w-[14rem]"
          >
            新規ゲームを開始
          </Button>
          <button
            type="button"
            onClick={() => startGame(true)}
            disabled={starting}
            className="text-xs text-brand-muted underline-offset-2 transition hover:text-brand-gold hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            シードゲームで開始（生成スキップ）
          </button>
        </div>

        {recent.length > 0 && (
          <section className="w-full max-w-sm space-y-2 text-left">
            <h2 className="font-serif text-sm text-brand-muted">直近のゲーム</h2>
            <ul className="space-y-1">
              {recent.slice(0, 3).map((g) => (
                <li key={g.gameId}>
                  <Link
                    href={`/play/${g.gameId}`}
                    className="flex items-center justify-between rounded-card border border-brand-border bg-brand-surface px-card py-2 text-sm text-brand-text transition hover:border-brand-gold/50"
                  >
                    <span className="font-mono text-xs text-brand-muted">
                      {g.gameId.slice(0, 16)}…
                    </span>
                    <span className="flex items-center gap-2 text-xs">
                      {g.label === 'seed' && (
                        <span className="rounded bg-brand-info/15 px-1.5 py-0.5 text-brand-info">
                          seed
                        </span>
                      )}
                      <StatusBadge status={g.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {starting && (
        <StartGameLoader
          error={error}
          onRetry={() => startGame(false)}
          onUseSeed={() => startGame(true)}
        />
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: RecentGame['status'] }) {
  const { label, tone } =
    status === 'in_progress'
      ? { label: '進行中', tone: 'text-brand-gold' }
      : status === 'won'
        ? { label: '勝利', tone: 'text-brand-success' }
        : { label: '敗北', tone: 'text-brand-danger' };
  return <span className={tone}>{label}</span>;
}
