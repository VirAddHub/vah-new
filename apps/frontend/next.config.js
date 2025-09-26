/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Build will succeed even with lint errors (lint can still run in CI separately)
    ignoreDuringBuilds: true,
  },
};
module.exports = nextConfig;
