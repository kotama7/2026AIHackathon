export default async function PlayHomePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  return (
    <section className="flex flex-col gap-card">
      <h1 className="font-serif text-3xl text-brand-gold">村の概要</h1>
      <p className="text-brand-muted">
        gameId: <code>{gameId}</code>
      </p>
      <p className="max-w-prose text-sm text-brand-muted">
        プレースホルダ。本実装は B2-03 (Village Overview)。住民 6
        人グリッド、各キャラの公開プロフィール、事件概要、被害者表示を行う。
      </p>
    </section>
  );
}
