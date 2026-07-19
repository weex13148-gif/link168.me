import { evaluatePublicProfileAccess } from "@/domains/profile/public-profile-access";
import { getActiveRestrictions } from "@/lib/auth";
import { db } from "@/lib/db";

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function profileQueryByUserId(userId: string) {
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

type ResolvedProfile = NonNullable<Awaited<ReturnType<typeof profileQueryByUserId>>>;

export type PublicProfileResolution =
  | Readonly<{ type: "missing" }>
  | Readonly<{ type: "reserved" }>
  | Readonly<{ type: "redirect"; username: string }>
  | Readonly<{ type: "unavailable" }>
  | Readonly<{
      type: "current";
      profile: ResolvedProfile;
      access: ReturnType<typeof evaluatePublicProfileAccess>;
    }>;

async function loadCurrentProfile(profile: ResolvedProfile): Promise<PublicProfileResolution> {
  const [owner, restrictions] = await Promise.all([
    db.user.findUnique({
      where: { id: profile.userId },
      select: {
        accountStatus: true,
        emailVerified: true,
        role: true,
      },
    }),
    getActiveRestrictions(profile.userId),
  ]);

  if (!owner) return Object.freeze({ type: "unavailable" });

  return Object.freeze({
    type: "current",
    profile,
    access: evaluatePublicProfileAccess({
      isPublic: profile.isPublic,
      accountStatus: owner.accountStatus,
      emailVerified: owner.emailVerified,
      role: owner.role,
      restrictionTypes: restrictions.map((restriction) => restriction.type),
    }),
  });
}

export async function resolvePublicProfileAccess(
  rawUsername: string,
): Promise<PublicProfileResolution> {
  const normalized = normalizeUsername(rawUsername);
  if (!normalized) return Object.freeze({ type: "missing" });

  try {
    const direct = await db.profile.findUnique({
      where: { username: normalized },
      include: {
        links: {
          where: { isActive: true },
          orderBy: { position: "asc" },
        },
      },
    });
    if (direct) return loadCurrentProfile(direct);

    const now = new Date();
    const registry = await db.usernameRegistry.findUnique({
      where: { normalizedUsername: normalized },
      select: { userId: true, status: true, reservedUntil: true },
    });

    if (registry?.status === "CURRENT" && registry.userId) {
      const profile = await profileQueryByUserId(registry.userId);
      if (profile) return loadCurrentProfile(profile);
    }

    if (registry?.status === "PERMANENTLY_RESERVED") {
      return Object.freeze({ type: "reserved" });
    }

    if (
      registry?.status === "RESERVED_90_DAYS" &&
      registry.userId &&
      registry.reservedUntil &&
      registry.reservedUntil > now
    ) {
      const currentProfile = await db.profile.findUnique({
        where: { userId: registry.userId },
        select: { username: true },
      });
      if (currentProfile && normalizeUsername(currentProfile.username) !== normalized) {
        return Object.freeze({ type: "redirect", username: currentProfile.username });
      }
    }

    const history = await db.usernameHistory.findFirst({
      where: { normalizedUsername: normalized },
      orderBy: { createdAt: "desc" },
    });
    if (history?.replacedBy && history.reservedUntil && history.reservedUntil > now) {
      return Object.freeze({ type: "redirect", username: history.replacedBy });
    }

    return Object.freeze({ type: "missing" });
  } catch {
    return Object.freeze({ type: "unavailable" });
  }
}
