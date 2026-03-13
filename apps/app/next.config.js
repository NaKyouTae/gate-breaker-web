/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@gate-breaker/ui', '@gate-breaker/api-client', '@gate-breaker/types'],
};

module.exports = nextConfig;
