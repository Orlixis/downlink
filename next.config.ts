import type { NextConfig } from "next";

const isPages = process.env.BUILD_FOR_PAGES === "true";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  output: "export",
  ...(isPages
    ? {
        basePath: "/downlink",
        assetPrefix: "/downlink",
      }
    : {}),
};

export default nextConfig;
