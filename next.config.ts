import type { NextConfig } from "next";

// Kitloom is a fully static export for Cloudflare Pages (see docs/deployment.md).
// Nothing here may depend on a request-time server.
const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  images: { unoptimized: true },
};

export default nextConfig;
