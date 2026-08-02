/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  poweredByHeader: false,
  images: {
    domains: ["ipfs.io", "gateway.pinata.cloud"],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: { optimizePackageImports: ['lucide-react', 'framer-motion', '@medsync/ui'] },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
};

export default nextConfig;
