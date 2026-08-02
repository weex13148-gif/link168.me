import { readFileSync } from "fs";
import { resolvePublicAvatarUrl } from "@/lib/public-avatar";
import { getAvatarUploadSuccessMessage } from "@/components/dashboard-v1/core-store";
import type { AvatarModerationStatus } from "@/components/dashboard-v1/types";

const mockRequireDashboardUser = jest.fn();
const mockGetOwnedProfile = jest.fn();
const mockToProfileDto = jest.fn((profile) => profile);
const mockModerateImageContent = jest.fn();
const mockDeletePreviousAvatar = jest.fn();
const mockRevalidatePublicProfileByUser = jest.fn();
const mockRequireJeepworkAdmin = jest.fn();
const mockGetJeepworkSessionUser = jest.fn();
const mockWriteAdminAuditLog = jest.fn();
const mockMkdir = jest.fn();
const mockWriteFile = jest.fn();
const mockRm = jest.fn();
const mockTransaction = jest.fn();
const mockDb = {
  profile: { update: jest.fn() },
  contentModerationRecord: { findUnique: jest.fn() },
  $transaction: mockTransaction,
};
const mockTx = {
  profile: { update: jest.fn() },
  contentModerationRecord: {
    upsert: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

jest.mock("@/lib/auth", () => ({ requireDashboardUser: mockRequireDashboardUser }));
jest.mock("@/lib/dashboard-data", () => ({ getOwnedProfile: mockGetOwnedProfile, toProfileDto: mockToProfileDto }));
jest.mock("@/lib/content-safety", () => ({ moderateImageContent: mockModerateImageContent }));
jest.mock("@/app/api/dashboard/avatar/cleanup", () => ({ deletePreviousAvatar: mockDeletePreviousAvatar }));
jest.mock("@/lib/cache/public-profile", () => ({ revalidatePublicProfileByUser: mockRevalidatePublicProfileByUser }));
jest.mock("@/lib/jeepwork-auth", () => ({ requireJeepworkAdmin: mockRequireJeepworkAdmin, getJeepworkSessionUser: mockGetJeepworkSessionUser }));
jest.mock("@/lib/admin-audit-log", () => ({ writeAdminAuditLog: mockWriteAdminAuditLog }));
jest.mock("@/lib/db", () => ({ db: mockDb }));
jest.mock("fs/promises", () => ({ mkdir: mockMkdir, writeFile: mockWriteFile, rm: mockRm }));

describe("public avatar moderation", () => {
  const updatedAt = new Date("2026-07-23T08:09:10.000Z");

  test.each(["pending", "pending_manual_review", "rejected"])(
    "hides %s avatars from public consumers",
    (avatarModerationStatus) => {
      expect(resolvePublicAvatarUrl({
        avatarUrl: "/api/avatar/alice?stale=1",
        avatarModerationStatus,
        updatedAt,
      })).toBeNull();
    },
  );

  test.each(["approved", "legacy_approved"])(
    "returns a versioned public URL for %s avatars",
    (avatarModerationStatus) => {
      expect(resolvePublicAvatarUrl({
        avatarUrl: "/api/avatar/alice?stale=1",
        avatarModerationStatus,
        updatedAt,
      })).toBe("/api/avatar/alice?v=1784794150000");
    },
  );

  test("returns null without an avatar URL", () => {
    expect(resolvePublicAvatarUrl({
      avatarUrl: null,
      avatarModerationStatus: "approved",
      updatedAt,
    })).toBeNull();
  });
});

describe("dashboard avatar upload message", () => {
  const statuses: AvatarModerationStatus[] = ["pending", "pending_manual_review", "rejected", "approved", "legacy_approved"];

  test("handles every dashboard avatar moderation status", () => {
    expect(statuses.map(getAvatarUploadSuccessMessage)).toEqual([
      "头像已上传，待人工审核（待配置验证）。审核通过后公开展示。",
      "头像已上传，待人工审核（待配置验证）。审核通过后公开展示。",
      "头像已上传，待人工审核（待配置验证）。审核通过后公开展示。",
      "头像已更新，并已同步到预览和公开主页。",
      "头像已更新，并已同步到预览和公开主页。",
    ]);
  });

  test("keeps pending avatars out of the public-sync success message", () => {
    expect(getAvatarUploadSuccessMessage("pending_manual_review")).toBe(
      "头像已上传，待人工审核（待配置验证）。审核通过后公开展示。",
    );
  });

  test.each(["approved", "legacy_approved"] as const)("confirms public sync only for %s", (status) => {
    expect(getAvatarUploadSuccessMessage(status)).toBe("头像已更新，并已同步到预览和公开主页。");
  });
});

describe("avatar moderation lifecycle integration", () => {
  const read = (file: string) => readFileSync(file, "utf8");

  test("uploads persist the profile and avatar moderation record in one transaction", () => {
    const route = read("src/app/api/dashboard/avatar/route.ts");
    expect(route).toContain("db.$transaction(async (tx)");
    expect(route).toContain("tx.profile.update");
    expect(route).toContain("tx.contentModerationRecord.upsert");
    expect(route).toContain("contentType_contentRef");
    expect(route).toContain('contentType: "avatar"');
    expect(route).toContain('moderationReason = "待配置验证"');
    expect(route).toContain('moderationProvider = "local"');
    expect(route).toContain("reviewedAt: null");
    expect(route).toContain("reviewerId: null");
  });

  test("administrator avatar review synchronizes profile visibility in one transaction", () => {
    const route = read("src/app/api/jeepwork/moderation/route.ts");
    expect(route).toContain("contentModerationRecord.findUnique");
    expect(route).toContain("db.$transaction(async (tx)");
    expect(route).toContain('record.contentType === "avatar"');
    expect(route).toContain("tx.profile.update");
    expect(route).toContain("revalidatePublicProfileByUser");
    expect(route).toContain("status: 404");
  });

  test("public page and dashboard preview gate avatars by moderation status", () => {
    const publicPage = read("src/app/[username]/page.tsx");
    const dashboard = read("src/components/dashboard-v1/DashboardV1Client.tsx");
    const dto = read("src/lib/dashboard-data.ts");
    const types = read("src/components/dashboard-v1/types.ts");
    const profilePanel = read("src/components/dashboard-v1/ProfilePanel.tsx");

    expect(publicPage).toContain("resolvePublicAvatarUrl");
    expect(dashboard).toContain("avatar_moderation_status");
    expect(dto).toContain("avatar_moderation_status: toAvatarModerationStatus(profile.avatarModerationStatus)");
    expect(types).toContain("avatar_moderation_status: AvatarModerationStatus");
    expect(profilePanel).toContain("审核通过后公开展示");
    expect(profilePanel).toContain("待人工审核（待配置验证）");
  });
});

describe("avatar moderation route behavior", () => {
  const profile = {
    id: "11111111-1111-4111-8111-111111111111",
    userId: "22222222-2222-4222-8222-222222222222",
    username: "alice",
    avatarUrl: "/api/avatar/alice",
    avatarModerationStatus: "approved",
    updatedAt: new Date("2026-07-23T08:09:10.000Z"),
  };

  const createAvatarRequest = () => {
    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const formData = new FormData();
    formData.append("avatar", new Blob([png], { type: "image/png" }), "avatar.png");
    return new Request("http://localhost/api/dashboard/avatar", { method: "POST", body: formData });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireDashboardUser.mockResolvedValue({ user: { id: profile.userId }, response: null });
    mockGetOwnedProfile.mockResolvedValue(profile);
    mockModerateImageContent.mockResolvedValue({ status: "approved", riskLevel: "low", reason: "safe", provider: "cloud" });
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockRm.mockResolvedValue(undefined);
    mockTx.profile.update.mockResolvedValue({ ...profile, avatarUrl: "/api/avatar/alice", avatarModerationStatus: "approved", updatedAt: profile.updatedAt });
    mockTx.contentModerationRecord.upsert.mockResolvedValue({});
    mockTx.contentModerationRecord.update.mockResolvedValue({ id: "record-1", contentType: "avatar", contentRef: profile.id, status: "approved" });
    mockTx.contentModerationRecord.updateMany.mockResolvedValue({ count: 1 });
    mockTx.contentModerationRecord.findUnique.mockResolvedValue({ id: "record-1", contentType: "avatar", contentRef: profile.id, status: "approved" });
    mockDb.contentModerationRecord.findUnique.mockResolvedValue({ id: "record-1", contentType: "avatar", contentRef: profile.id, status: "pending_manual_review", updatedAt: profile.updatedAt });
    mockTransaction.mockImplementation(async (callback) => callback(mockTx));
    mockDeletePreviousAvatar.mockResolvedValue({ status: "deleted" });
    mockRevalidatePublicProfileByUser.mockResolvedValue(undefined);
    mockRequireJeepworkAdmin.mockResolvedValue(null);
    mockGetJeepworkSessionUser.mockResolvedValue({ id: "admin-1", email: "admin@example.com", role: "super_admin" });
    mockWriteAdminAuditLog.mockResolvedValue(undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("persists the configuration fallback reason for manual review without a provider reason", async () => {
    mockModerateImageContent.mockResolvedValue({ status: "pending_manual_review", riskLevel: "medium", provider: "cloud" });
    const { POST } = await import("@/app/api/dashboard/avatar/route");

    const response = await POST(createAvatarRequest());

    expect(response.status).toBe(200);
    expect(mockTx.contentModerationRecord.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ status: "pending_manual_review", reason: "待配置验证" }),
      update: expect.objectContaining({ status: "pending_manual_review", reason: "待配置验证" }),
    }));
  });

  test("persists a local configuration fallback when moderation throws", async () => {
    mockModerateImageContent.mockRejectedValueOnce(new Error("provider unavailable"));
    const { POST } = await import("@/app/api/dashboard/avatar/route");

    const response = await POST(createAvatarRequest());

    expect(response.status).toBe(200);
    expect(mockTx.contentModerationRecord.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        status: "pending_manual_review",
        reason: "待配置验证",
        provider: "local",
      }),
    }));
  });

  test("removes a newly written file when the avatar transaction fails before commit", async () => {
    mockTransaction.mockRejectedValueOnce(new Error("database unavailable"));
    const { POST } = await import("@/app/api/dashboard/avatar/route");

    const response = await POST(createAvatarRequest());

    expect(response.status).toBe(500);
    expect(mockRm).toHaveBeenCalledTimes(1);
  });

  test("keeps a committed avatar when public revalidation fails", async () => {
    mockRevalidatePublicProfileByUser.mockRejectedValueOnce(new Error("cache unavailable"));
    const { POST } = await import("@/app/api/dashboard/avatar/route");

    const response = await POST(createAvatarRequest());

    expect(response.status).toBe(200);
    expect(mockRm).not.toHaveBeenCalled();
  });

  test("keeps a committed avatar when old-avatar cleanup fails", async () => {
    mockDeletePreviousAvatar.mockRejectedValueOnce(new Error("storage unavailable"));
    const { POST } = await import("@/app/api/dashboard/avatar/route");

    const response = await POST(createAvatarRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.mediaCleanup).toMatchObject({ status: "failed", reason: "post_commit_cleanup_failed" });
    expect(mockRm).not.toHaveBeenCalled();
  });

  test("synchronizes an approved avatar profile before revalidating", async () => {
    const events: string[] = [];
    mockTx.contentModerationRecord.updateMany.mockImplementation(async () => { events.push("record"); return { count: 1 }; });
    mockTx.profile.update.mockImplementation(async () => { events.push("profile"); return { userId: profile.userId }; });
    mockRevalidatePublicProfileByUser.mockImplementation(async () => { events.push("revalidate"); });
    const { PATCH } = await import("@/app/api/jeepwork/moderation/route");

    const response = await PATCH(new Request("http://localhost/api/jeepwork/moderation", {
      method: "PATCH",
      body: JSON.stringify({ id: "record-1", status: "approved" }),
    }));

    expect(response.status).toBe(200);
    expect(events).toEqual(["record", "profile", "revalidate"]);
  });

  test("returns a conflict without profile synchronization or revalidation when the record changed", async () => {
    mockTx.contentModerationRecord.updateMany.mockResolvedValueOnce({ count: 0 });
    const { PATCH } = await import("@/app/api/jeepwork/moderation/route");

    const response = await PATCH(new Request("http://localhost/api/jeepwork/moderation", {
      method: "PATCH",
      body: JSON.stringify({ id: "record-1", status: "approved" }),
    }));

    expect(response.status).toBe(409);
    expect(mockTx.profile.update).not.toHaveBeenCalled();
    expect(mockRevalidatePublicProfileByUser).not.toHaveBeenCalled();
  });

  test("keeps a committed moderator decision successful when public revalidation fails", async () => {
    mockRevalidatePublicProfileByUser.mockRejectedValueOnce(new Error("cache unavailable"));
    const { PATCH } = await import("@/app/api/jeepwork/moderation/route");

    const response = await PATCH(new Request("http://localhost/api/jeepwork/moderation", {
      method: "PATCH",
      body: JSON.stringify({ id: "record-1", status: "approved" }),
    }));

    expect(response.status).toBe(200);
    expect(mockWriteAdminAuditLog).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
