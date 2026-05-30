// @ts-check
// .ts ではなく .mjs にしている理由: Firebase webframeworks は next.config を esbuild で
// bundle しようとし、Windows + pnpm workspace:* 環境ではその esbuild 自動 install が
// 失敗してデプロイが落ちる。プレーン JS なら回避しやすい。
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// @village/shared は npm が解決できない workspace:* 依存。package.json から外し、
// ソースを直接 alias 参照する (tsc は tsconfig paths、webpack は下記 alias で解決)。
const sharedEntry = resolve(here, '../../packages/shared/src/index.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // app ディレクトリ外 (packages/shared/src) の TS をコンパイル許可
  experimental: { externalDir: true },
  // 画像最適化を無効化 (sharp を SSR 関数の依存から外す)。
  // sharp は @img/sharp-<platform> の optional 依存を持ち、Windows 生成のロックファイルだと
  // クラウド(Linux)の `npm ci` が "Missing @img/sharp-linux-* from lock file" で落ちるため。
  images: { unoptimized: true },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@village/shared': sharedEntry,
    };
    // @village/shared は NodeNext 規約で相対 import に .js を付ける (実体は .ts)。
    // webpack に .js→.ts 解決を教えないと "Can't resolve './contracts/index.js'" になる。
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};

export default nextConfig;
