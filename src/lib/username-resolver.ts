import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

async function loadProfileByUserId(userId: string) {
  return db.profile.findUnique({
    where: { userId },
    include: {
      links: {
        where: { isActive: true },
        orderBy: { position: "asc" },
      },
    },
  });
}

export async function resolveUsername(rawUsername: string) {
  const normalized = normalizeUsername(rawUsername);
  if (!normalized) return { type: "missing" as const };

  const direct = await db.profile
    .findUnique({
      where: { username: normalized },
      include: {
        links: {
          where: { isActive: true },
          orderBy: { position: "asc" },
        },
      },
    })
    .catch(() => null);
  if (direct) return { type: "current" as const, profile: direct };

  const registry = await db.usernameRegistry
    .findUnique({
      where: { normalizedUsername: normalized },
      select: { userId: true, status: true, reservedUntil: true },
    })
    .catch(() => null);

  if (registry?.status === "CURRENT" && registry.userId) {
    const profile = await loadProfileByUserId(registry.userId).catch(() => null);
    if (profile) return { type: "current" as const, profile };
  }

  if (registry?.status === "PERMANENTLY_RESERVED") {
    return { type: "reserved" as const };
  }

  if (
    registry?.status === "RESERVED_90_DAYS" &&
    registry.userId &&
    registry.reservedUntil &&
    registry.reservedUntil > new Date()
  ) {
    const currentProfile = await db.profile
      .findUnique({
        where: { userId: registry.userId },
        select: { username: true },
      })
      .catch(() => null);
    if (currentProfile && normalizeUsername(currentProfile.username) !== normalized) {
      return { type: "redirect" as const, username: currentProfile.username };
    }
  }

  const history = await db.usernameHistory
    .findFirst({
      where: { normalizedUsername: normalized },
      orderBy: { createdAt: "desc" },
    })
    .catch(() => null);
  if (history?.replacedBy && history.reservedUntil && history.reservedUntil > new Date()) {
    return { type: "redirect" as const, username: history.replacedBy };
  }

  return { type: "missing" as const };
}

export const cachedResolveUsername = unstable_cache(
  async (rawUsername: string) => resolveUsername(rawUsername),
  ["public-profile"],
  { revalidate: 60 }
);
