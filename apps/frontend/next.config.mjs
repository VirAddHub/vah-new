// apps/frontend/next.config.mjs
const BACKEND_API_ORIGIN = (process.env.BACKEND_API_ORIGIN || 'https://vah-api-staging.onrender.com')
  .replace(/\/+$/, '');

console.log('[next.config] BACKEND_API_ORIGIN:', BACKEND_API_ORIGIN);

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
