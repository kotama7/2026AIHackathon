import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

// @village/shared は npm が解決できない workspace:* 依存なので package.json から外し、
// esbuild の alias で src を直接参照して inline 化する (tsc は paths、jest は moduleNameMapper で解決)。
const sharedEntry = fileURLToPath(new URL('../packages/shared/src/index.ts', import.meta.url));

/**
 * Functions のデプロイ用バンドル。
 *
 * pnpm モノレポの `@village/shared`（workspace:* 依存）は npm が解決できず、
 * Cloud Functions のクラウド側 install が `EUNSUPPORTEDPROTOCOL` で失敗する。
 * そこで @village/shared だけを esbuild で inline 化し、デプロイ成果物から
 * workspace 依存を消す。残りの npm 依存はランタイムで通常どおり install させる
 * (firebase-admin はネイティブ/動的 require があり bundle 非推奨なので external)。
 */
await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  sourcemap: true,
  alias: { '@village/shared': sharedEntry },
  // ここに挙げた実 npm パッケージは bundle せず、package.json の dependencies から install。
  // @village/shared は external にしない = inline 化される。
  external: [
    'firebase-admin',
    'firebase-admin/*',
    'firebase-functions',
    'firebase-functions/*',
    '@google/generative-ai',
    'zod',
  ],
  logLevel: 'info',
});
