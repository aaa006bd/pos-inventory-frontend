import type { NextConfig } from "next";

const backendApiUrl = (
  process.env.BACKEND_API_URL || "http://217.217.249.227:3001"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
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
