import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://link168.me").replace(/\/$/, "");
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  try {
    const profiles = await db.profile.findMany({
      where: {
        isPublic: true,
        user: { emailVerified: true },
      },
      select: { username: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 20_000,
    });

    return [
      ...staticPages,
      ...profiles.map((profile) => ({
        url: `${baseUrl}/${encodeURIComponent(profile.username)}`,
        lastModified: profile.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch (error) {
    console.error("[sitemap] public profile query failed", error);
    return staticPages;
  }
}
