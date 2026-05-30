import type { ReactNode } from 'react';

import { GameNav } from '@/components/game/GameNav';

export default async function PlayLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  return <GameNav gameId={gameId}>{children}</GameNav>;
}
