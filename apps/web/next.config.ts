import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@village/shared'],
  typedRoutes: true,
  webpack: (config) => {
    // @village/shared の TS source は ESM 風に `.js` 拡張子付きで import しているため、
    // webpack 側でも `.js` を `.ts`/`.tsx` にフォールバック解決させる。
    // tsconfig の moduleResolution: Bundler とペア。
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};

export default nextConfig;
