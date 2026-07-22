import type { MetadataRoute } from "next";
import { db, isDatabaseConfigured } from "@/lib/db";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://link168.me").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 基础页面
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${appUrl}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${appUrl}/pricing`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${appUrl}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${appUrl}/register`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${appUrl}/showcase`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${appUrl}/help`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${appUrl}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${appUrl}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${appUrl}/report`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  // 公开主页
  let publicProfiles: MetadataRoute.Sitemap = [];
  if (!isDatabaseConfigured) {
    return staticRoutes;
  }
  try {
    const profiles = await db.profile.findMany({
      where: { isPublic: true },
      select: {
        username: true,
        updatedAt: true,
      },
      take: 5000,
    });

    publicProfiles = profiles.map((profile) => ({
      url: `${appUrl}/${profile.username}`,
      lastModified: profile.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    // 静默失败，只返回静态路由
  }

  return [...staticRoutes, ...publicProfiles];
}
