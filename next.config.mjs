/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: '/quote',
  assetPrefix: '/quote',
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
};

export default nextConfig;
