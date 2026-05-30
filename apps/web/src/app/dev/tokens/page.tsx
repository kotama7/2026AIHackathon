const COLORS = [
  { token: 'bg-brand-bg', desc: '基本背景' },
  { token: 'bg-brand-surface', desc: '一段上の面' },
  { token: 'bg-brand-overlay', desc: 'モーダル背後' },
  { token: 'text-brand-text', desc: '通常テキスト' },
  { token: 'text-brand-emphasis', desc: '強調' },
  { token: 'text-brand-muted', desc: '弱め' },
  { token: 'text-brand-gold', desc: '金 accent' },
  { token: 'text-brand-gold-strong', desc: '金 strong' },
  { token: 'text-brand-danger', desc: '危険' },
  { token: 'text-brand-danger-strong', desc: '危険 strong' },
  { token: 'text-brand-success', desc: '成功' },
  { token: 'text-brand-info', desc: '情報' },
  { token: 'border-brand-border', desc: '罫線 弱' },
  { token: 'border-brand-border-strong', desc: '罫線 強' },
];

const SPACING = ['gutter', 'card', 'section', 'page'] as const;
const RADII = ['card'] as const;

export default function TokensDevPage() {
  return (
    <main className="mx-auto max-w-board space-y-section p-page">
      <header>
        <h1 className="text-4xl text-brand-gold">Design Tokens</h1>
        <p className="mt-2 text-sm text-brand-muted">
          開発確認用。色 / spacing / radius / typography をブラウザで確認できる。
        </p>
      </header>

      <section className="space-y-card">
        <h2 className="text-2xl text-brand-emphasis">Colors</h2>
        <div className="grid grid-cols-1 gap-card sm:grid-cols-2 lg:grid-cols-3">
          {COLORS.map((c) => (
            <div
              key={c.token}
              className="flex items-center gap-card rounded-card border border-brand-border bg-brand-surface p-card"
            >
              <span
                className={`h-10 w-10 rounded border border-brand-border ${
                  c.token.startsWith('bg-') ? c.token : c.token.replace('text-', 'bg-')
                }`}
                aria-hidden
              />
              <div className="flex flex-col">
                <code className="text-xs text-brand-text">{c.token}</code>
                <span className="text-xs text-brand-muted">{c.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-card">
        <h2 className="text-2xl text-brand-emphasis">Spacing</h2>
        <div className="space-y-2">
          {SPACING.map((s) => (
            <div key={s} className="flex items-center gap-card">
              <code className="w-24 text-xs text-brand-muted">{`p-${s}`}</code>
              <div className={`bg-brand-gold/30 p-${s}`}>
                <span className="text-xs text-brand-text">spacing.{s}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-card">
        <h2 className="text-2xl text-brand-emphasis">Radius</h2>
        <div className="flex items-center gap-card">
          {RADII.map((r) => (
            <div
              key={r}
              className={`flex h-20 w-20 items-center justify-center bg-brand-surface rounded-${r} border border-brand-border`}
            >
              <code className="text-xs text-brand-muted">{r}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-card">
        <h2 className="text-2xl text-brand-emphasis">Typography</h2>
        <div className="space-y-2">
          <p className="font-serif text-5xl text-brand-gold">見出し Serif</p>
          <p className="font-serif text-3xl text-brand-emphasis">見出し中</p>
          <p className="text-lg text-brand-text">本文 Sans-serif（normal weight）</p>
          <p className="text-sm text-brand-muted">muted small text</p>
        </div>
      </section>

      <section className="space-y-card">
        <h2 className="text-2xl text-brand-emphasis">Shadow</h2>
        <div className="flex gap-card">
          <div className="rounded-card bg-brand-surface p-card shadow-card">shadow-card</div>
          <div className="rounded-card bg-brand-surface p-card shadow-modal">shadow-modal</div>
        </div>
      </section>
    </main>
  );
}
