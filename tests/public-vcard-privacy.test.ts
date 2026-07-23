const mockDb = {
  profile: { findUnique: jest.fn() },
};
const mockGetActiveRestrictions = jest.fn();
const mockCanShowPublicProfile = jest.fn();

jest.mock("@/lib/db", () => ({ db: mockDb }));
jest.mock("@/lib/auth", () => ({
  getActiveRestrictions: (...args: unknown[]) => mockGetActiveRestrictions(...args),
  canShowPublicProfile: (...args: unknown[]) => mockCanShowPublicProfile(...args),
}));

import { GET } from "@/app/api/public/[username]/vcard/route";

describe("public vCard privacy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActiveRestrictions.mockResolvedValue([]);
    mockCanShowPublicProfile.mockReturnValue({ ok: true });
    mockDb.profile.findUnique.mockResolvedValue({
      userId: "user-1",
      displayName: "林溪",
      username: "owner",
      bio: "帮助本地商家改善经营",
      company: "林溪经营工作室",
      jobTitle: "经营顾问",
      phone: "13800138000",
      email: "private@example.com",
      wechat: "private-wechat",
      city: "杭州",
      address: "私密地址 1 号",
      website: "https://private.example.com",
      socialLinks: { weibo: "https://social.example.com/private" },
      contactVisibility: "private",
      isPublic: true,
    });
  });

  test("private profiles receive a basic vCard without private contact fields", async () => {
    const response = await GET(
      new Request("http://localhost/api/public/owner/vcard") as never,
      { params: Promise.resolve({ username: "owner" }) },
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain("FN:林溪");
    expect(body).toContain("ORG:林溪经营工作室");
    expect(body).toContain("TITLE:经营顾问");
    expect(body).toContain("NOTE:帮助本地商家改善经营");
    expect(body).not.toContain("13800138000");
    expect(body).not.toContain("private@example.com");
    expect(body).not.toContain("private-wechat");
    expect(body).not.toContain("私密地址");
    expect(body).not.toContain("private.example.com");
    expect(body).not.toContain("social.example.com");
  });
});
