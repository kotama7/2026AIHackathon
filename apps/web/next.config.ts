import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@village/shared'],
  typedRoutes: true,
};

export default nextConfig;
