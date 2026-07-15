import { db } from "@/lib/db";
import {
  deleteOwnedMediaObject,
  type OwnedMediaDeleteResult,
} from "@/lib/owned-media";

export async function isManagedMediaUrlReferenced(url: string): Promise<boolean> {
  const [profileCount, linkCount, productCount] = await Promise.all([
    db.profile.count({
      where: {
        OR: [
          { avatarUrl: url },
          { coverImageUrl: url },
          { customTheme: { contains: url } },
        ],
      },
    }),
    db.link.count({
      where: {
        OR: [
          { iconUrl: url },
          { payloadJson: { contains: url } },
        ],
      },
    }),
    db.product.count({ where: { coverImageUrl: url } }),
  ]);

  return profileCount + linkCount + productCount > 0;
}

export async function cleanupOwnedMediaUrls(
  urls: Iterable<string>,
  ownerId: string,
): Promise<OwnedMediaDeleteResult[]> {
  const results: OwnedMediaDeleteResult[] = [];
  for (const url of new Set(urls)) {
    results.push(await deleteOwnedMediaObject({
      url,
      ownerId,
      isStillReferenced: isManagedMediaUrlReferenced,
    }));
  }
  return results;
}
