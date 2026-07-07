import type { MetadataRoute } from "next";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://link168.me").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/showcase", "/help", "/pricing", "/s/"],
        disallow: [
          "/dashboard",
          "/workbench",
          "/console",
          "/admin",
          "/jeepwork",
          "/api/",
          "/account",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
          "/enterprise-ai",
          "/_next",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/showcase", "/help", "/pricing", "/s/"],
        disallow: ["/dashboard", "/workbench", "/console", "/admin", "/jeepwork", "/api/"],
      },
      {
        userAgent: "Googlebot-Image",
        allow: ["/", "/api/avatar/", "/api/dashboard/media/"],
        disallow: ["/dashboard", "/workbench", "/console", "/admin"],
      },
      {
        userAgent: "Bingbot",
        allow: ["/", "/showcase", "/help", "/pricing", "/s/"],
        disallow: ["/dashboard", "/workbench", "/console", "/admin", "/jeepwork", "/api/"],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}
