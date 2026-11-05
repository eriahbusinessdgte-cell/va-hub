import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Room for CSV imports with long notes (sent in batches of 100 leads)
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
