import Link from 'next/link';
import type { ReactNode } from 'react';

const PHASES = [
  { slug: 'discussion', label: '議論', taskRef: 'B2-05 / B3-01' },
  { slug: 'evidence', label: '証拠', taskRef: 'B2-06' },
  { slug: 'interrogate', label: '尋問', taskRef: 'B3-02' },
  { slug: 'pins', label: 'ピン留め', taskRef: 'B3-04 / B3-05' },
  { slug: 'trial', label: '裁判', taskRef: 'B4-01' },
  { slug: 'night', label: '夜', taskRef: 'B3-06' },
  { slug: 'result', label: '結果', taskRef: 'B4-02 / B4-03' },
] as const;

export default async function PlayLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-brand-border bg-brand-surface px-page py-card">
        <div className="mx-auto flex max-w-board items-center justify-between">
          <Link href="/" className="font-serif text-xl text-brand-gold transition hover:opacity-80">
            AI村裁判
          </Link>
          <span className="text-xs text-brand-muted">
            game: <code>{gameId}</code>
          </span>
        </div>
        <nav className="mx-auto mt-card flex max-w-board flex-wrap gap-2 text-sm">
          <Link
            href={`/play/${gameId}`}
            className="rounded-card border border-brand-border px-card py-1 text-brand-muted transition hover:bg-brand-bg hover:text-brand-text"
          >
            概要
          </Link>
          {PHASES.map((phase) => (
            <Link
              key={phase.slug}
              href={`/play/${gameId}/${phase.slug}`}
              className="rounded-card border border-brand-border px-card py-1 text-brand-muted transition hover:bg-brand-bg hover:text-brand-text"
            >
              {phase.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-board flex-1 p-page">{children}</main>
    </div>
  );
}
