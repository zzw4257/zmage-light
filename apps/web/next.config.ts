import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "4257",
        pathname: "/api/storage/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "4257",
        pathname: "/api/storage/**",
      },
      {
        protocol: "http",
        hostname: "img-lib-api",
        port: "4257",
        pathname: "/api/storage/**",
      },
      {
        protocol: "http",
        hostname: "img-lib-minio",
        port: "9000",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "34257",
        pathname: "/api/storage/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "30900",
        pathname: "/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:34257"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
