const mockDb = {
  link: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  linkClick: {
    create: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockGetActiveRestrictions = jest.fn();
const mockCanShowPublicProfile = jest.fn();

jest.mock("@/lib/db", () => ({ db: mockDb }));
jest.mock("@/lib/auth", () => ({
  getActiveRestrictions: mockGetActiveRestrictions,
  canShowPublicProfile: mockCanShowPublicProfile,
}));

import { POST } from "@/app/api/public/links/[linkId]/click/route";
import { generateEventDedupeId } from "@/lib/analytics/events";

function contactRequest(userAgent = "Mozilla/5.0") {
  return new Request("http://localhost/api/public/links/link-a/click", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": userAgent,
      "x-forwarded-for": "192.0.2.10",
    },
    body: JSON.stringify({ visitorId: "browser-visitor-a" }),
  });
}

describe("analytics event recording", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.link.findFirst.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      profileId: "22222222-2222-4222-8222-222222222222",
      profile: { isPublic: true, userId: "33333333-3333-4333-8333-333333333333" },
    });
    mockDb.user.findUnique.mockResolvedValue({ emailVerified: true });
    mockGetActiveRestrictions.mockResolvedValue([]);
    mockCanShowPublicProfile.mockReturnValue({ ok: true });
    mockDb.linkClick.create.mockResolvedValue({ id: "click-id" });
    mockDb.link.update.mockResolvedValue({});
    mockDb.$transaction.mockImplementation(async (callback: (tx: typeof mockDb) => unknown) => callback(mockDb));
  });

  test("generates a stable UUID for the same event minute", () => {
    const first = generateEventDedupeId(
      "contact:link-a",
      "profile-a",
      "visitor-a",
      new Date("2026-07-15T12:34:01.000Z"),
    );
    const repeated = generateEventDedupeId(
      "contact:link-a",
      "profile-a",
      "visitor-a",
      new Date("2026-07-15T12:34:59.000Z"),
    );
    const nextMinute = generateEventDedupeId(
      "contact:link-a",
      "profile-a",
      "visitor-a",
      new Date("2026-07-15T12:35:00.000Z"),
    );

    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(repeated).toBe(first);
    expect(nextMinute).not.toBe(first);
  });

  test("persists one real contact LinkClick and increments its counter", async () => {
    const response = await POST(contactRequest(), {
      params: Promise.resolve({ linkId: "11111111-1111-4111-8111-111111111111" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true, recorded: true });
    expect(mockDb.link.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: "11111111-1111-4111-8111-111111111111",
        isActive: true,
        type: { in: ["phone", "email", "wechat"] },
      }),
    }));
    expect(mockDb.linkClick.create).toHaveBeenCalledTimes(1);
    expect(mockDb.link.update).toHaveBeenCalledWith({
      where: { id: "11111111-1111-4111-8111-111111111111" },
      data: { totalClicks: { increment: 1 } },
    });
  });

  test("treats a duplicate event id as idempotent success", async () => {
    mockDb.linkClick.create.mockRejectedValueOnce({ code: "P2002" });

    const response = await POST(contactRequest(), {
      params: Promise.resolve({ linkId: "11111111-1111-4111-8111-111111111111" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      recorded: false,
      deduplicated: true,
    });
    expect(mockDb.link.update).not.toHaveBeenCalled();
  });

  test("does not record bots or interactions on a private profile", async () => {
    const botResponse = await POST(contactRequest("Googlebot/2.1"), {
      params: Promise.resolve({ linkId: "11111111-1111-4111-8111-111111111111" }),
    });
    expect(botResponse.status).toBe(200);
    await expect(botResponse.json()).resolves.toMatchObject({ success: true, recorded: false });
    expect(mockDb.linkClick.create).not.toHaveBeenCalled();

    mockDb.link.findFirst.mockResolvedValueOnce({
      id: "11111111-1111-4111-8111-111111111111",
      profileId: "22222222-2222-4222-8222-222222222222",
      profile: { isPublic: false, userId: "33333333-3333-4333-8333-333333333333" },
    });
    const privateResponse = await POST(contactRequest(), {
      params: Promise.resolve({ linkId: "11111111-1111-4111-8111-111111111111" }),
    });
    expect(privateResponse.status).toBe(404);
    expect(mockDb.linkClick.create).not.toHaveBeenCalled();
  });
});
