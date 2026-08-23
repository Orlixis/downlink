import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Vercel serverless functions & edge runtime are natively supported
};

export default nextConfig;
