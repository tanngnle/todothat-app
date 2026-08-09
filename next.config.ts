import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Receipt uploads (up to 10 MB) travel through a server action;
  // the default 1 MB limit would reject them.
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
