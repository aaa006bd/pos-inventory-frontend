import type { NextConfig } from "next";

const backendApiUrl = (
  process.env.BACKEND_API_URL || "http://217.217.249.227:3001"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Opt out locally when mounted-filesystem caches retain stale dev routes.
    turbopackFileSystemCacheForDev: process.env.DISABLE_TURBOPACK_FS_CACHE === "1" ? false : undefined,
  },
  async redirects() {
    return [
      {
        source: "/dashboard/sales/history/:id/return",
        destination: "/dashboard/sales/history/:id?action=return",
        permanent: false,
      },
      {
        source: "/dashboard/sales/records/:id/return",
        destination: "/dashboard/sales/history/:id?action=return",
        permanent: false,
      },
    ];
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
