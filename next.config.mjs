/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: '/quote',
  assetPrefix: '/quote',
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  transpilePackages: ['@unionam/shared-i18n', '@unionam/shared-ui'],
};

export default nextConfig;
