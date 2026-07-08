/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    domains: ["ipfs.io", "gateway.pinata.cloud"],
  },
};

export default nextConfig;
