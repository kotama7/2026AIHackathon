import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-page">
      <div className="flex max-w-prose flex-col items-center gap-card text-center">
        <p className="font-serif text-6xl text-brand-gold">404</p>
        <p className="text-brand-muted">そのページは存在しません。</p>
        <Link
          href="/"
          className="rounded-card border border-brand-border px-card py-2 text-brand-text transition hover:bg-brand-surface"
        >
          タイトルへ
        </Link>
      </div>
    </main>
  );
}
