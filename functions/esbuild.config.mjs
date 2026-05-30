import { build } from 'esbuild';

/**
 * Functions を単一ファイルにバンドルする。
 *
 * 目的: `@village/shared` の package.json は `main`/`exports` が生 TS (`./src/index.ts`)
 * を指すため、tsc 出力 (`lib/*.js`) が実行時に `import '@village/shared'` を解決すると
 * Node が `.ts` を読み込もうとして ERR_UNKNOWN_FILE_EXTENSION で落ちる。
 * そこで `@village/shared` (および相対 import) だけをバンドルでインライン化し、
 * firebase-functions / firebase-admin など実 npm パッケージは external のまま残す。
 */

/** 相対パスと @village/shared 以外（= 実 node_modules パッケージ）を external にするプラグイン */
const externalDeps = {
  name: 'external-node-deps',
  setup(b) {
    b.onResolve({ filter: /.*/ }, (args) => {
      if (args.kind === 'entry-point') return null;
      // 相対・絶対パスはバンドル対象
      if (args.path.startsWith('.') || args.path.startsWith('/')) return null;
      // ワークスペースの shared はバンドルしてインライン化（生 TS 解決を回避）
      if (args.path === '@village/shared' || args.path.startsWith('@village/shared/')) {
        return null;
      }
      // それ以外（firebase-functions, firebase-admin, zod, @google/... 等）は external
      return { path: args.path, external: true };
    });
  },
};

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  sourcemap: true,
  logLevel: 'info',
  plugins: [externalDeps],
});
