import type { NextConfig } from "next";

// Next.js runtime supports allowedHosts but types may lag behind.
// Using explicit type assertion for forward compatibility.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  allowedHosts: [
    "link168.me",
    "www.link168.me",
    "122.51.183.200",
    "127.0.0.1",
    "localhost",
  ],
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "@upstash/redis", "ioredis"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
        ],
      },
    ];
  },
} satisfies NextConfig & { allowedHosts?: string[] };

export default nextConfig;
