// apps/frontend/next.config.mjs
const BACKEND_API_ORIGIN = (process.env.BACKEND_API_ORIGIN || 'https://vah-api-staging.onrender.com')
  .replace(/\/+$/, '');

console.log('[next.config] BACKEND_API_ORIGIN:', BACKEND_API_ORIGIN);

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      // Apply this rewrite BEFORE checking Next's filesystem routes (pages/api or app/api)
      beforeFiles: [
        // send everything under /api/* to Render
        {
          source: '/api/:path*',
          destination: `${BACKEND_API_ORIGIN}/api/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  
  async redirects() {
    return [
      {
        source: '/about',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
