import crypto from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { GET as followLink } from "@/app/go/[linkId]/route";
import { GET as readAvatar } from "@/app/api/avatar/[username]/route";
import { db } from "@/lib/db";
import { getUploadRoot } from "@/lib/upload-storage";

const createdUserIds: string[] = [];
const createdFiles: string[] = [];

async function createOwner(input: {
  emailVerified?: boolean;
  accountStatus?: string;
  isPublic?: boolean;
  restrictionType?: string;
  withAvatar?: boolean;
}) {
  const userId = crypto.randomUUID();
  const profileId = crypto.randomUUID();
  const linkId = crypto.randomUUID();
  const username = `phase1-resource-${userId.slice(0, 10)}`;
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
          id: profileId,
          username,
          isPublic: input.isPublic ?? true,
          avatarUrl: input.withAvatar ? `/api/avatar/${username}` : null,
          avatarModerationStatus: "approved",
          links: {
            create: {
              id: linkId,
              title: "安全跳转",
              url: "https://example.com/target",
              isActive: true,
            },
          },
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

  if (input.withAvatar) {
    const assetId = crypto.randomUUID();
    const storageKey = `avatars/${profileId}/${crypto.randomUUID()}.png`;
    const filePath = path.join(getUploadRoot(), ...storageKey.split("/"));
    const data = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
    createdFiles.push(filePath);

    await db.$transaction([
      db.mediaAsset.create({
        data: {
          id: assetId,
          ownerUserId: userId,
          profileId,
          purpose: "avatar",
          storageProvider: "local",
          storageKey,
          originalName: "avatar.png",
          mimeType: "image/png",
          sizeBytes: data.byteLength,
          checksumSha256: crypto.createHash("sha256").update(data).digest("hex"),
          status: "approved",
        },
      }),
      db.profile.update({
        where: { id: profileId },
        data: { avatarAssetId: assetId },
      }),
    ]);
  }

  return { userId, profileId, linkId, username };
}

async function clickCount(linkId: string) {
  const [clicks, link] = await Promise.all([
    db.linkClick.count({ where: { linkId } }),
    db.link.findUniqueOrThrow({ where: { id: linkId }, select: { totalClicks: true } }),
  ]);
  return { clicks, totalClicks: link.totalClicks };
}

async function follow(linkId: string) {
  return followLink(
    new NextRequest(`http://localhost/go/${linkId}`, {
      headers: { "user-agent": "phase1-resource-test", "x-real-ip": "127.0.0.1" },
    }),
    { params: Promise.resolve({ linkId }) },
  );
}

async function avatar(username: string) {
  return readAvatar(new Request(`http://localhost/api/avatar/${username}`), {
    params: Promise.resolve({ username }),
  });
}

afterEach(async () => {
  await Promise.all(createdFiles.splice(0).map((filePath) => unlink(filePath).catch(() => undefined)));
  if (createdUserIds.length > 0) {
    await db.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
  }
});

describe("Phase 1 public resource guards", () => {
  test("an allowed profile may follow a link and record exactly one click", async () => {
    const owner = await createOwner({});
    const response = await follow(owner.linkId);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://example.com/target");
    expect(await clickCount(owner.linkId)).toEqual({ clicks: 1, totalClicks: 1 });
  });

  test.each([
    ["private", { isPublic: false }],
    ["unverified", { emailVerified: false }],
    ["deactivated", { accountStatus: "deactivated" }],
    ["admin freeze", { restrictionType: "ADMIN_FREEZE" }],
    ["banned", { restrictionType: "BANNED" }],
  ] as const)("a %s profile cannot use /go and produces no analytics", async (_label, state) => {
    const owner = await createOwner(state);
    const response = await follow(owner.linkId);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("http://localhost/");
    expect(await clickCount(owner.linkId)).toEqual({ clicks: 0, totalClicks: 0 });
  });

  test("an allowed approved avatar is returned from its exact MediaAsset key", async () => {
    const owner = await createOwner({ withAvatar: true });
    const response = await avatar(owner.username);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await response.arrayBuffer()).subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  });

  test.each([
    ["private", { isPublic: false }],
    ["unverified", { emailVerified: false }],
    ["deactivated", { accountStatus: "deactivated" }],
    ["admin freeze", { restrictionType: "ADMIN_FREEZE" }],
  ] as const)("a %s profile cannot expose its avatar", async (_label, state) => {
    const owner = await createOwner({ ...state, withAvatar: true });
    const response = await avatar(owner.username);
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
