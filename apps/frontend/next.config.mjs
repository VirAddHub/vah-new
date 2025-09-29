// apps/frontend/next.config.mjs
const BACKEND_API_ORIGIN =
  process.env.BACKEND_API_ORIGIN || 'https://vah-api-staging.onrender.com';

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_API_ORIGIN}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
