/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: 'export',
  basePath: '/projects/hidden-agenda',
  assetPrefix: '/projects/hidden-agenda',
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: '/projects/hidden-agenda'
  }
};

module.exports = nextConfig;

