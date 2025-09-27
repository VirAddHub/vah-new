/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Re-enable ESLint in build - now all rules are warnings
    ignoreDuringBuilds: false,
  },
};
module.exports = nextConfig;
