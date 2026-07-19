import crypto from "node:crypto";
import fs from "node:fs";
import { db } from "@/lib/db";
import { evaluatePublicProfileAccess } from "@/domains/profile/public-profile-access";
import { resolvePublicProfileAccess } from "@/infrastructure/profile/prisma-public-profile-access";

const createdUserIds: string[] = [];

async function createProfileOwner(input: {
  emailVerified?: boolean;
  accountStatus?: string;
  isPublic?: boolean;
  restrictionType?: string;
}) {
  const userId = crypto.randomUUID();
  const username = `phase1-access-${userId.slice(0, 12)}`;
  createdUserIds.push(userId);
  await db.user.create({
    data: {
      id: userId,
      email: `${username}@example.com`,
      passwordHash: "test-password-hash",
      emailVerified: input.emailVerified ?? true,
      accountStatus: input.accountStatus ?? "active",
      role: "user",
      profile: {
        create: {
          id: crypto.randomUUID(),
          username,
          displayName: "公开访问测试",
          isPublic: input.isPublic ?? true,
        },
      },
      ...(input.restrictionType
        ? {
            freezeRecords: {
              create: {
                id: crypto.randomUUID(),
                type: input.restrictionType,
                source: "system",
                isActive: true,
              },
            },
          }
        : {}),
    },
  });
  return { userId, username };
}

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await db.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
  }
});

describe("Phase 1 public profile access policy", () => {
  test("pure decision reuses account capability priority before publication state", () => {
    expect(
      evaluatePublicProfileAccess({
        isPublic: true,
        accountStatus: "deactivated",
        emailVerified: true,
        role: "user",
        restrictionTypes: [],
      }),
    ).toEqual({ allowed: false, reason: "ACCOUNT_INACTIVE" });

    expect(
      evaluatePublicProfileAccess({
        isPublic: true,
        accountStatus: "active",
        emailVerified: true,
        role: "user",
        restrictionTypes: ["ADMIN_FREEZE"],
      }),
    ).toEqual({ allowed: false, reason: "ADMIN_FREEZE" });

    expect(
      evaluatePublicProfileAccess({
        isPublic: true,
        accountStatus: "active",
        emailVerified: false,
        role: "user",
        restrictionTypes: [],
      }),
    ).toEqual({ allowed: false, reason: "EMAIL_UNVERIFIED" });

    expect(
      evaluatePublicProfileAccess({
        isPublic: false,
        accountStatus: "active",
        emailVerified: true,
        role: "user",
        restrictionTypes: [],
      }),
    ).toEqual({ allowed: false, reason: "PROFILE_NOT_PUBLIC" });

    expect(
      evaluatePublicProfileAccess({
        isPublic: true,
        accountStatus: "active",
        emailVerified: true,
        role: "user",
        restrictionTypes: [],
      }),
    ).toEqual({ allowed: true, reason: null });
  });

  test("Prisma resolver allows only active verified public profiles", async () => {
    const allowedOwner = await createProfileOwner({});
    const allowed = await resolvePublicProfileAccess(allowedOwner.username);
    expect(allowed.type).toBe("current");
    if (allowed.type === "current") {
      expect(allowed.access).toEqual({ allowed: true, reason: null });
      expect(allowed.profile.username).toBe(allowedOwner.username);
    }

    const privateOwner = await createProfileOwner({ isPublic: false });
    const privateResult = await resolvePublicProfileAccess(privateOwner.username);
    expect(privateResult.type).toBe("current");
    if (privateResult.type === "current") {
      expect(privateResult.access.reason).toBe("PROFILE_NOT_PUBLIC");
    }

    const unverifiedOwner = await createProfileOwner({ emailVerified: false });
    const unverified = await resolvePublicProfileAccess(unverifiedOwner.username);
    expect(unverified.type).toBe("current");
    if (unverified.type === "current") {
      expect(unverified.access.reason).toBe("EMAIL_UNVERIFIED");
    }
  });

  test("Prisma resolver denies account and restriction states with the same priority", async () => {
    const deactivatedOwner = await createProfileOwner({ accountStatus: "deactivated" });
    const deactivated = await resolvePublicProfileAccess(deactivatedOwner.username);
    expect(deactivated.type).toBe("current");
    if (deactivated.type === "current") {
      expect(deactivated.access.reason).toBe("ACCOUNT_INACTIVE");
    }

    const frozenOwner = await createProfileOwner({ restrictionType: "ADMIN_FREEZE" });
    const frozen = await resolvePublicProfileAccess(frozenOwner.username);
    expect(frozen.type).toBe("current");
    if (frozen.type === "current") {
      expect(frozen.access.reason).toBe("ADMIN_FREEZE");
    }

    const bannedOwner = await createProfileOwner({ restrictionType: "BANNED" });
    const banned = await resolvePublicProfileAccess(bannedOwner.username);
    expect(banned.type).toBe("current");
    if (banned.type === "current") {
      expect(banned.access.reason).toBe("BANNED");
    }
  });

  test("resolver awaits capability loading so rejected restriction queries fail closed", () => {
    const resolver = fs.readFileSync(
      "src/infrastructure/profile/prisma-public-profile-access.ts",
      "utf8",
    );
    expect(resolver).toContain("if (direct) return await loadCurrentProfile(direct);");
    expect(resolver).toContain("if (profile) return await loadCurrentProfile(profile);");
  });

  test("page and metadata share the infrastructure resolver instead of split policy reads", () => {
    const page = fs.readFileSync("src/app/[username]/page.tsx", "utf8");
    expect(page).toContain("resolvePublicProfileAccess");
    expect(page.match(/resolvePublicProfileAccess\(username\)/g)).toHaveLength(2);
    expect(page).not.toContain("canShowPublicProfile");
    expect(page).not.toContain("syncEmailVerificationRestriction");
    expect(page).not.toContain("getActiveRestrictions");
    expect(page).not.toContain("db.user.findUnique");
  });
});
