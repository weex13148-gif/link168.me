import crypto from "node:crypto";
import fs from "node:fs";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { db } from "@/lib/db";
import { PUT as putDashboard } from "@/app/api/dashboard/route";
import { PUT as putProfileSettings } from "@/app/api/dashboard/profile/route";

const createdUserIds: string[] = [];

async function createAccount(emailVerified: boolean, withProfile = true) {
  const userId = crypto.randomUUID();
  createdUserIds.push(userId);
  await db.user.create({
    data: {
      id: userId,
      email: `phase1-private-${userId}@example.com`,
      passwordHash: "test-password-hash",
      emailVerified,
      accountStatus: "active",
      role: "user",
      ...(withProfile
        ? {
            profile: {
              create: {
                id: crypto.randomUUID(),
                username: `phase1-${userId.slice(0, 12)}`,
                isPublic: false,
              },
            },
          }
        : {}),
    },
  });
  const { token } = await createSession(userId);
  return { userId, token };
}

function jsonRequest(path: string, token: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "PUT",
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await db.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
  }
});

describe("Phase 1 private-by-default profile publishing", () => {
  test("database default keeps a newly created profile private", async () => {
    const { userId } = await createAccount(true, false);
    const profile = await db.profile.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        username: `default-private-${userId.slice(0, 12)}`,
      },
    });
    expect(profile.isPublic).toBe(false);
  });

  test("unverified user can edit ordinary profile fields without publishing", async () => {
    const { userId, token } = await createAccount(false);
    const response = await putProfileSettings(
      jsonRequest("/api/dashboard/profile", token, {
        displayName: "未验证但可以继续编辑",
        bio: "编辑不等于公开。",
      }),
    );
    expect(response.status).toBe(200);
    const profile = await db.profile.findUniqueOrThrow({ where: { userId } });
    expect(profile.displayName).toBe("未验证但可以继续编辑");
    expect(profile.isPublic).toBe(false);
  });

  test("unverified user can explicitly keep the page private", async () => {
    const { userId, token } = await createAccount(false);
    const response = await putProfileSettings(
      jsonRequest("/api/dashboard/profile", token, { isPublic: false }),
    );
    expect(response.status).toBe(200);
    expect((await db.profile.findUniqueOrThrow({ where: { userId } })).isPublic).toBe(false);
  });

  test("unverified user cannot publish", async () => {
    const { userId, token } = await createAccount(false);
    const response = await putProfileSettings(
      jsonRequest("/api/dashboard/profile", token, { isPublic: true }),
    );
    expect(response.status).toBe(403);
    expect((await db.profile.findUniqueOrThrow({ where: { userId } })).isPublic).toBe(false);
  });

  test("verified user can publish", async () => {
    const { userId, token } = await createAccount(true);
    const response = await putProfileSettings(
      jsonRequest("/api/dashboard/profile", token, { isPublic: true }),
    );
    expect(response.status).toBe(200);
    expect((await db.profile.findUniqueOrThrow({ where: { userId } })).isPublic).toBe(true);
  });

  test("ordinary dashboard edits never force a private page public", async () => {
    const { userId, token } = await createAccount(false);
    const response = await putDashboard(
      jsonRequest("/api/dashboard", token, {
        displayName: "保存资料",
        bio: "仍然保持未发布",
      }),
    );
    expect(response.status).toBe(200);
    const profile = await db.profile.findUniqueOrThrow({ where: { userId } });
    expect(profile.displayName).toBe("保存资料");
    expect(profile.isPublic).toBe(false);
  });

  test("registration, upsert and client fallbacks are private by default", () => {
    const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
    const registration = fs.readFileSync("src/app/api/auth/register/route.ts", "utf8");
    const dashboardRoute = fs.readFileSync("src/app/api/dashboard/route.ts", "utf8");
    const profileRoute = fs.readFileSync("src/app/api/dashboard/profile/route.ts", "utf8");
    const client = fs.readFileSync("src/components/dashboard-v1/DashboardV1Client.tsx", "utf8");

    expect(schema).toContain('isPublic                   Boolean          @default(false) @map("is_public")');
    expect(registration).toContain("isPublic: false");
    expect(dashboardRoute).not.toContain("isPublic: true");
    expect(profileRoute).toContain("isPublic: isPublicValue ?? false");
    expect(client).toContain("core.profile?.is_public ?? false");
    expect(client).toContain("邮箱验证完成前，主页保持未发布；你仍可继续编辑资料。");
    expect(client).not.toContain("30 天内完成验证");
  });
});
