/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // Optimize for Vercel deployment
  images: {
    domains: [],
    unoptimized: false,
  },
  // Reduce bundle size
  output: "standalone",
  // Production optimization
  poweredByHeader: false,
  compress: true,
  // Environment variables validation
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_ADSENSE_CLIENT_ID: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID,
  },
};

module.exports = nextConfig;
