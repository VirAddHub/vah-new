/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // avoid lightningcss native binding in CI
    optimizeCss: false
  }
};

module.exports = nextConfig;
