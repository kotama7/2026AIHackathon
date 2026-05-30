import './globals.css';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI村裁判',
  description: 'AIキャラクター同士の議論ログから人狼を特定する、一人用推理ゲーム',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
