import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-page">
      <div className="flex max-w-prose flex-col items-center gap-section text-center">
        <div>
          <h1 className="font-serif text-6xl font-bold tracking-tight text-brand-gold">AI村裁判</h1>
          <p className="mt-card text-brand-muted">
            AIキャラクター同士の議論ログから人狼を特定する、一人用推理ゲーム
          </p>
        </div>
        <div className="flex flex-col gap-card">
          <Link
            href="/play/demo"
            className="rounded-card border border-brand-gold bg-brand-gold/10 px-page py-card font-serif text-lg text-brand-gold transition hover:bg-brand-gold/20"
          >
            新規ゲームを開始
          </Link>
          <p className="text-xs text-brand-muted">
            ※ デモ用ルート。本実装は B2-01 (タイトル画面) で。
          </p>
        </div>
      </div>
    </main>
  );
}
