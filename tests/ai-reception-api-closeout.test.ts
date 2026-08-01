import fs from "node:fs";
import path from "node:path";

const mockDb = {
  aiServiceConfig: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  profile: {
    findUnique: jest.fn(),
  },
};

const mockRequireDashboardUser = jest.fn();
const mockRevalidatePublicProfileByUser = jest.fn();
const mockGetActiveRestrictions = jest.fn();
const mockCanShowPublicProfile = jest.fn();
const mockResolvePublicAiRequestContext = jest.fn();

jest.mock("@/lib/db", () => ({ db: mockDb }));
jest.mock("@/lib/auth", () => ({
  requireDashboardUser: mockRequireDashboardUser,
  getActiveRestrictions: mockGetActiveRestrictions,
  canShowPublicProfile: mockCanShowPublicProfile,
}));
jest.mock("@/lib/cache/public-profile", () => ({
  revalidatePublicProfileByUser: mockRevalidatePublicProfileByUser,
}));
jest.mock("@/lib/ai/public-request-context", () => ({
  resolvePublicAiRequestContext: mockResolvePublicAiRequestContext,
}));

import {
  GET as getCustomerConfig,
  PUT as putCustomerConfig,
} from "@/app/api/dashboard/ai-service-config/route";
import { GET as getPublicConfig } from "@/app/api/public/[username]/ai-reception-config/route";

const userId = "11111111-1111-4111-8111-111111111111";

function dashboardRequest(method: "GET" | "PUT", body?: unknown) {
  return new Request("http://localhost/api/dashboard/ai-service-config", {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function publicRequest(username = "owner") {
  return new Request(`http://localhost/api/public/${username}/ai-reception-config`);
}

function storedConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    userId,
    enabled: true,
    assistantName: "经营助手",
    welcomeMessage: "你好，请选择你想了解的内容。",
    tone: "friendly",
    allowProductRecommendation: true,
    collectLead: true,
    allowReport: true,
    allowTransferToHuman: false,
    privacyNoticeText: null,
    quickActionsJson: JSON.stringify([
      {
        id: "price",
        label: "价格说明",
        type: "auto_reply",
        value: "价格以当前页面展示为准。",
        enabled: true,
        position: 0,
      },
    ]),
    providerMode: "internal-provider",
    createdAt: new Date("2026-07-16T00:00:00.000Z"),
    updatedAt: new Date("2026-07-16T00:00:00.000Z"),
    ...overrides,
  };
}

describe("customer AI reception configuration API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireDashboardUser.mockResolvedValue({
      user: { id: userId, email: "owner@example.com" },
      response: null,
    });
    mockDb.aiServiceConfig.findUnique.mockResolvedValue(storedConfig());
    mockDb.aiServiceConfig.upsert.mockImplementation(async ({ create, update }: { create: unknown; update: unknown }) => ({
      ...storedConfig(),
      ...create as Record<string, unknown>,
      ...update as Record<string, unknown>,
    }));
    mockRevalidatePublicProfileByUser.mockResolvedValue(undefined);
  });

  test("requires an authenticated dashboard user", async () => {
    mockRequireDashboardUser.mockResolvedValueOnce({
      user: null,
      response: Response.json({ success: false, error: "Unauthorized." }, { status: 401 }),
    });

    const response = await getCustomerConfig(dashboardRequest("GET"));
    expect(response.status).toBe(401);
    expect(mockDb.aiServiceConfig.findUnique).not.toHaveBeenCalled();
  });

  test("reads only the current user's customer-facing configuration", async () => {
    const response = await getCustomerConfig(dashboardRequest("GET"));
    expect(response.status).toBe(200);
    expect(mockDb.aiServiceConfig.findUnique).toHaveBeenCalledWith({ where: { userId } });

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.config).toMatchObject({
      enabled: true,
      assistantName: "经营助手",
      quickActions: [expect.objectContaining({ id: "price", type: "auto_reply" })],
    });
    expect(JSON.stringify(json)).not.toMatch(/internal-provider|providerMode|model|credential|endpoint|workspace|token/i);
  });

  test("returns a disabled safe default when the user has no record", async () => {
    mockDb.aiServiceConfig.findUnique.mockResolvedValueOnce(null);
    const response = await getCustomerConfig(dashboardRequest("GET"));
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      config: {
        enabled: false,
        assistantName: "AI 助理",
        quickActions: [],
      },
    });
  });

  test("upserts only customer fields and ignores platform provider input", async () => {
    const response = await putCustomerConfig(dashboardRequest("PUT", {
      enabled: true,
      assistantName: "新助手",
      welcomeMessage: "欢迎咨询",
      tone: "professional",
      allowProductRecommendation: false,
      collectLead: true,
      allowReport: false,
      privacyNoticeText: "请勿发送敏感信息。",
      quickActions: [
        {
          id: "copy",
          label: "复制微信",
          type: "copy_text",
          value: "contact-id",
          enabled: true,
          position: 0,
        },
      ],
      providerMode: "external-provider",
      aiProvider: "external-provider",
      aiModel: "external-model",
      aiCredential: "redacted-value",
    }));

    expect(response.status).toBe(200);
    expect(mockDb.aiServiceConfig.upsert).toHaveBeenCalledWith({
      where: { userId },
      create: expect.objectContaining({
        userId,
        assistantName: "新助手",
        tone: "professional",
        quickActionsJson: expect.stringContaining('"copy"'),
      }),
      update: expect.objectContaining({
        assistantName: "新助手",
        tone: "professional",
        quickActionsJson: expect.stringContaining('"copy"'),
      }),
    });

    const upsert = mockDb.aiServiceConfig.upsert.mock.calls[0][0];
    expect(upsert.create).not.toHaveProperty("providerMode");
    expect(upsert.create).not.toHaveProperty("aiProvider");
    expect(upsert.create).not.toHaveProperty("aiModel");
    expect(upsert.create).not.toHaveProperty("aiCredential");
    expect(mockRevalidatePublicProfileByUser).toHaveBeenCalledWith(userId);
  });

  test("rejects invalid quick actions without writing", async () => {
    const response = await putCustomerConfig(dashboardRequest("PUT", {
      quickActions: [
        {
          id: "unsafe",
          label: "非安全链接",
          type: "open_url",
          value: "http://example.com",
          enabled: true,
          position: 0,
        },
      ],
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ success: false });
    expect(mockDb.aiServiceConfig.upsert).not.toHaveBeenCalled();
  });
});

describe("public AI reception configuration API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActiveRestrictions.mockResolvedValue([]);
    mockCanShowPublicProfile.mockReturnValue({ ok: true });
    mockResolvePublicAiRequestContext.mockResolvedValue({
      ok: true,
      expectedWorkspaceId: null,
    });
    mockDb.profile.findUnique.mockResolvedValue({
      id: "33333333-3333-4333-8333-333333333333",
      userId,
      username: "owner",
      isPublic: true,
      user: {
        emailVerified: true,
        aiServiceConfig: storedConfig(),
      },
      links: [{ id: "ai-link" }],
    });
  });

  test("returns only the public DTO for an eligible profile", async () => {
    const response = await getPublicConfig(publicRequest(), {
      params: Promise.resolve({ username: "owner" }),
    });
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({
      success: true,
      config: {
        assistantName: "经营助手",
        welcomeMessage: "你好，请选择你想了解的内容。",
        quickActions: [expect.objectContaining({ id: "price" })],
      },
    });
    expect(JSON.stringify(json)).not.toMatch(/internal-provider|providerMode|model|credential|endpoint|workspace|token/i);
  });

  test("rejects an unverified public request context before profile lookup", async () => {
    mockResolvePublicAiRequestContext.mockResolvedValueOnce({
      ok: false,
      code: "PUBLIC_CONTEXT_UNVERIFIED",
      message: "unverified",
    });

    const response = await getPublicConfig(publicRequest(), {
      params: Promise.resolve({ username: "owner" }),
    });

    expect(response.status).toBe(403);
    expect(mockDb.profile.findUnique).not.toHaveBeenCalled();
  });

  test.each([
    ["missing profile", null, 404],
    ["private profile", { isPublic: false }, 404],
    ["unverified owner", { user: { emailVerified: false, aiServiceConfig: storedConfig() } }, 403],
    ["disabled customer config", { user: { emailVerified: true, aiServiceConfig: storedConfig({ enabled: false }) } }, 404],
    ["missing active AI component", { links: [] }, 404],
  ])("fails closed for %s", async (_label, patch, expectedStatus) => {
    if (patch === null) {
      mockDb.profile.findUnique.mockResolvedValueOnce(null);
    } else {
      const base = await mockDb.profile.findUnique();
      mockDb.profile.findUnique.mockResolvedValueOnce({ ...base, ...patch });
    }

    const response = await getPublicConfig(publicRequest(), {
      params: Promise.resolve({ username: "owner" }),
    });
    expect(response.status).toBe(expectedStatus);
  });
});

describe("AI reception persistence files", () => {
  test("Prisma schema and migration persist quick actions on AiServiceConfig", () => {
    const root = process.cwd();
    const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
    const migrationPath = path.join(
      root,
      "prisma/migrations/20260716070000_ai_reception_quick_actions/migration.sql",
    );

    expect(schema).toMatch(/quickActionsJson\s+String\?\s+@map\("quick_actions_json"\)/);
    expect(fs.existsSync(migrationPath)).toBe(true);
    expect(fs.readFileSync(migrationPath, "utf8")).toContain('ADD COLUMN "quick_actions_json" TEXT');
  });
});
