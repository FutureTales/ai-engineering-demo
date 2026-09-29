import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The system prompt reads data/catalog/*.md at runtime (policies + service index):
  // ship those files with the serverless function.
  outputFileTracingIncludes: {
    "/api/chat": ["./data/catalog/**/*"],
  },
};

export default nextConfig;
