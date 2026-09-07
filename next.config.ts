import type { NextConfig } from "next";

const backendApiUrl = (
  process.env.BACKEND_API_URL || "http://217.217.249.227:3001"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  experimental: {
    // Opt out locally when mounted-filesystem caches retain stale dev routes.
    turbopackFileSystemCacheForDev: process.env.DISABLE_TURBOPACK_FS_CACHE === "1" ? false : undefined,
  },
  async rewrites() {
    return [
      {
        source: "/backend-api/:path*",
        destination: `${backendApiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
