import fs from "node:fs";
import path from "node:path";
import {
  allowedIconTypes,
  detectPlatformIcon,
  getDefaultIconForUrl,
  getPlatformIconOptions,
  resolvePlatformIcon,
} from "@/lib/link-icons";

const root = process.cwd();

const mockDb = {
  link: {
    count: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};
const mockGetOwnedProfile = jest.fn();
const mockRevalidate = jest.fn();

jest.mock("@/lib/auth", () => ({
  requireDashboardUser: jest.fn(async () => ({
    user: { id: "owner-1", email: "owner@example.com" },
    response: null,
  })),
}));

jest.mock("@/lib/db", () => ({ db: mockDb }));

jest.mock("@/lib/dashboard-data", () => ({
  getOwnedProfile: (...args: unknown[]) => mockGetOwnedProfile(...args),
  newId: () => "link-new",
  normalizeNullableString: (value: unknown) =>
    typeof value === "string" ? value.trim() || null : null,
  toLinkDto: (value: unknown) => value,
}));

jest.mock("@/lib/cache/public-profile", () => ({
  revalidatePublicProfileByUser: (...args: unknown[]) => mockRevalidate(...args),
}));

jest.mock("@/lib/billing/entitlements", () => ({
  getUserEntitlements: jest.fn(async () => ({
    hasActiveMembership: false,
    isGracePeriod: false,
  })),
}));

describe("platform link icons", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOwnedProfile.mockResolvedValue({ id: "profile-1", userId: "owner-1" });
    mockDb.link.count.mockResolvedValue(0);
    mockDb.link.create.mockImplementation(async ({ data }: { data: unknown }) => data);
    mockDb.link.findFirst.mockResolvedValue({
      id: "link-1",
      profileId: "profile-1",
      type: "link",
      title: "LinkedIn",
      url: "https://linkedin.com/in/owner",
      description: null,
      iconType: "platform",
      iconValue: "linkedin",
      iconUrl: null,
      payloadJson: null,
      isActive: true,
    });
    mockDb.link.update.mockImplementation(async ({ data }: { data: unknown }) => ({
      id: "link-1",
      ...data as Record<string, unknown>,
    }));
  });

  test("platform is a persisted allowlisted icon type", () => {
    expect(allowedIconTypes).toContain("platform");
    expect(getPlatformIconOptions().map((option) => option.key)).toEqual([
      "wechat",
      "douyin",
      "xiaohongshu",
      "bilibili",
      "youtube",
      "linkedin",
      "instagram",
      "facebook",
      "x",
    ]);
  });

  test.each([
    ["https://mp.weixin.qq.com/s/example", "wechat"],
    ["https://www.douyin.com/user/example", "douyin"],
    ["https://www.xiaohongshu.com/user/profile/example", "xiaohongshu"],
    ["https://b23.tv/example", "bilibili"],
    ["https://youtu.be/example", "youtube"],
    ["https://www.linkedin.com/in/example", "linkedin"],
    ["https://instagram.com/example", "instagram"],
    ["https://facebook.com/example", "facebook"],
    ["https://x.com/example", "x"],
  ])("detects %s as %s", (url, expected) => {
    expect(detectPlatformIcon(url)).toBe(expected);
    expect(getDefaultIconForUrl(url)).toMatchObject({
      iconType: "platform",
      iconValue: expected,
    });
  });

  test("renders only local allowlisted assets", () => {
    expect(resolvePlatformIcon("linkedin")).toMatch(/^\/platform-logos\//);
    expect(resolvePlatformIcon("https://attacker.example/icon.svg")).toBeNull();
    expect(resolvePlatformIcon("../secrets.svg")).toBeNull();

    for (const option of getPlatformIconOptions()) {
      const publicPath = resolvePlatformIcon(option.key);
      expect(publicPath).not.toBeNull();
      expect(fs.existsSync(path.join(root, "public", publicPath!.slice(1)))).toBe(true);
    }
  });

  test("unknown URLs use the generic link icon", () => {
    expect(detectPlatformIcon("https://example.com/path")).toBeNull();
    expect(getDefaultIconForUrl("https://example.com/path")).toEqual({
      iconType: "default",
      iconValue: "",
      label: "通用链接",
    });
  });

  test("create API persists an allowlisted platform key", async () => {
    const { POST } = await import("@/app/api/dashboard/links/route");
    const response = await POST(new Request("http://localhost/api/dashboard/links", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "LinkedIn",
        url: "https://linkedin.com/in/owner",
        iconType: "platform",
        iconValue: "linkedin",
      }),
    }));

    expect(response.status).toBe(200);
    expect(mockDb.link.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        iconType: "platform",
        iconValue: "linkedin",
        iconUrl: null,
      }),
    });
  });

  test("create API rejects remote image injection as a platform key", async () => {
    const { POST } = await import("@/app/api/dashboard/links/route");
    const response = await POST(new Request("http://localhost/api/dashboard/links", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Unsafe",
        url: "https://example.com",
        iconType: "platform",
        iconValue: "https://attacker.example/icon.svg",
      }),
    }));

    expect(response.status).toBe(400);
    expect(mockDb.link.create).not.toHaveBeenCalled();
  });

  test("manual platform selection survives an unrelated URL change", async () => {
    const { PATCH } = await import("@/app/api/dashboard/links/[id]/route");
    const response = await PATCH(new Request("http://localhost/api/dashboard/links/link-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "https://youtube.com/watch?v=example",
        iconType: "platform",
        iconValue: "linkedin",
      }),
    }), { params: Promise.resolve({ id: "link-1" }) });

    expect(response.status).toBe(200);
    expect(mockDb.link.update).toHaveBeenCalledWith({
      where: { id: "link-1" },
      data: expect.objectContaining({
        url: "https://youtube.com/watch?v=example",
        iconType: "platform",
        iconValue: "linkedin",
      }),
    });
  });
});
