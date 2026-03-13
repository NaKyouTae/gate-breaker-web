/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@gate-breaker/ui', '@gate-breaker/api-client', '@gate-breaker/types'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

module.exports = nextConfig;
