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

  // Experimental features for performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
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
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: true
  }
};

module.exports = withBundleAnalyzer(nextConfig);
