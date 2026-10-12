import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? (isProd ? '/NastyMap' : '');

const nextConfig: NextConfig = {
  output: 'export',
  basePath: basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  images: {
    unoptimized: true,
  },
  transpilePackages: ['nastymap'],
};

export default nextConfig;
