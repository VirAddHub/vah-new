const path = require('path');

// Optional bundle analyzer - only load if available and ANALYZE is enabled
let withBundleAnalyzer = (config) => config;
try {
  if (process.env.ANALYZE === 'true') {
    withBundleAnalyzer = require('@next/bundle-analyzer')({
      enabled: true,
    });
  }
} catch (err) {
  console.warn('[next.config] @next/bundle-analyzer not available, skipping bundle analysis');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Note: Do NOT set output: 'standalone' for Vercel deployments
  // Vercel automatically handles Next.js builds - standalone is only for self-hosting
  // Removing output setting lets Vercel use its optimized build process
  
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "vah-api-staging.onrender.com" },
      { protocol: "https", hostname: "virtualaddresshub.co.uk" },
      { protocol: "https", hostname: "imgbb.com" },
      { protocol: "https", hostname: "i.ibb.co" },
    ],
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

  // Output file tracing root - removed for Vercel deployments
  // Vercel handles file tracing automatically, and setting this to monorepo root
  // causes Next.js to trace unnecessary files, slowing down builds significantly
  // outputFileTracingRoot: path.join(__dirname, '../../'),

  // Turbopack configuration (replaces experimental.turbo in Next.js 15)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // Experimental features for performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Optimize bundle splitting
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };

      // Tree shaking optimizations
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }

    return config;
  },

  // ESLint and TypeScript configs
  // Do not ignore build errors: keep CI/build honest.
};

module.exports = withBundleAnalyzer(nextConfig);
