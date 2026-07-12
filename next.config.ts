import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "@upstash/redis", "ioredis"],
  outputFileTracingExcludes: {
    "*": [
      "./docs/**",
      "./old/**",
      "./.trae-cn/**",
      "./.codex/**",
      "**/*.md",
    ],
  },
  async redirects() {
    return [
      { source: "/dashboard", destination: "/console/card", permanent: false },
      { source: "/workbench", destination: "/console", permanent: false },
      { source: "/workbench/card", destination: "/console/card", permanent: false },
      { source: "/workbench/products", destination: "/console/card/products", permanent: false },
      { source: "/workbench/short-links", destination: "/console/card/short-links", permanent: false },
      { source: "/workbench/analytics", destination: "/console/card/analytics", permanent: false },
      { source: "/workbench/leads", destination: "/console/customers", permanent: false },
      { source: "/workbench/ai-service", destination: "/console/ai/service", permanent: false },
      { source: "/workbench/knowledge", destination: "/console/ai/knowledge", permanent: false },
      { source: "/workbench/ai", destination: "/console/ai", permanent: false },
      { source: "/workbench/ai/:assistant", destination: "/console/ai/:assistant", permanent: false },
      { source: "/workbench/account", destination: "/console/account", permanent: false },
      { source: "/workbench/membership", destination: "/console/account/membership", permanent: false },
      { source: "/workbench/enterprise", destination: "/console/account/enterprise", permanent: false },
      { source: "/workbench/notifications", destination: "/console/account/notifications", permanent: false },
    ];
  },
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
};

export default nextConfig;
