import fs from "node:fs";
import path from "node:path";

const mockDb = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  profile: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
  usernameRegistry: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  usernameHistory: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockRequireDashboardUser = jest.fn();
const mockCreateSession = jest.fn();
const mockSetSessionCookie = jest.fn();
const mockSendVerificationCodeWithPolicy = jest.fn();
const mockRateLimit = jest.fn();

jest.mock("@/lib/db", () => ({ db: mockDb }));

jest.mock("bcrypt", () => ({
  __esModule: true,
  default: { hash: jest.fn(async () => "password-hash") },
}));

jest.mock("@/lib/auth", () => ({
  createSession: (...args: unknown[]) => mockCreateSession(...args),
  setSessionCookie: (...args: unknown[]) => mockSetSessionCookie(...args),
  requireDashboardUser: (...args: unknown[]) => mockRequireDashboardUser(...args),
  getActiveRestrictions: jest.fn(async () => []),
  syncEmailVerificationRestriction: jest.fn(async () => undefined),
  canUserLogin: jest.fn(() => ({ ok: true, reason: null })),
  RestrictionQueryError: class RestrictionQueryError extends Error {},
}));

jest.mock("@/lib/mail", () => ({
  sendVerificationCodeWithPolicy: (...args: unknown[]) =>
    mockSendVerificationCodeWithPolicy(...args),
}));

jest.mock("@/lib/rate-limit", () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}));

jest.mock("@/lib/dashboard-data", () => ({
  getDashboardData: jest.fn(async () => ({})),
  newId: () => "profile-new",
  normalizeUsername: (value: string) => value.trim().toLowerCase(),
  toProfileDto: (value: unknown) => value,
}));

describe("profile publication requires explicit owner consent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimit.mockResolvedValue({ passed: true, resetMs: 0 });
    mockCreateSession.mockResolvedValue({
      token: "session-token",
      expiresAt: new Date("2026-07-19T00:00:00.000Z"),
    });
    mockSendVerificationCodeWithPolicy.mockResolvedValue({ ok: true });
    mockRequireDashboardUser.mockResolvedValue({
      user: { id: "user-1", email: "owner@example.com", emailVerified: true },
      response: null,
    });
  });

  test("normal registration creates a private profile", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    mockDb.user.create.mockResolvedValue({ id: "user-1" });
    mockDb.profile.create.mockResolvedValue({ id: "profile-1" });
    mockDb.$transaction.mockImplementation(async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
    );

    const { POST } = await import("@/app/api/auth/register/route");
    const response = await POST(new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "owner@example.com",
        password: "password123",
        confirmPassword: "password123",
        agreeTerms: true,
      }),
    }));

    expect(response.status).toBe(200);
    expect(mockDb.profile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: expect.any(String), isPublic: false }),
    });
  });

  test("assignUsername creates a missing profile as private", async () => {
    const transactionDb = {
      profile: {
        findUnique: jest.fn(async () => null),
        update: jest.fn(),
        upsert: jest.fn(async ({ create }: { create: Record<string, unknown> }) => create),
      },
      usernameRegistry: {
        findUnique: jest.fn(async () => null),
        create: jest.fn(async () => ({})),
        update: jest.fn(async () => ({})),
      },
      usernameHistory: { create: jest.fn(async () => ({})) },
    };
    mockDb.$transaction.mockImplementation(async (callback: (tx: typeof transactionDb) => unknown) =>
      callback(transactionDb),
    );

    const { assignUsername } = await import("@/lib/username-registry");
    await expect(assignUsername("user-1", "owner-one")).resolves.toMatchObject({
      success: true,
      username: "owner-one",
      isInitialSet: true,
    });
    expect(transactionDb.profile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ userId: "user-1", isPublic: false }),
      }),
    );
  });

  test("AI conversation fallback creates a missing profile as private", async () => {
    mockDb.profile.findUnique.mockResolvedValue(null);
    mockDb.profile.create.mockResolvedValue({ id: "profile-ai" });

    const { ensureProfileForUser } = await import("@/lib/ai/conversations");
    await expect(ensureProfileForUser("user-ai-12345678")).resolves.toBe("profile-ai");
    expect(mockDb.profile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "user-ai-12345678", isPublic: false }),
      select: { id: true },
    });
  });

  test("legacy dashboard creates a private profile", async () => {
    mockDb.profile.findUnique.mockResolvedValue(null);
    mockDb.profile.upsert.mockImplementation(async ({ create }: { create: unknown }) => create);

    const { PUT } = await import("@/app/api/dashboard/route");
    const response = await PUT(new Request("http://localhost/api/dashboard", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "Owner" }),
    }));

    expect(response.status).toBe(200);
    expect(mockDb.profile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ userId: "user-1", isPublic: false }),
      }),
    );
  });

  test("legacy dashboard profile edits preserve the current publication state", async () => {
    mockDb.profile.findUnique.mockResolvedValue({
      id: "profile-1",
      userId: "user-1",
      username: "owner-one",
      isPublic: false,
    });
    mockDb.profile.upsert.mockImplementation(async ({ update }: { update: unknown }) => update);

    const { PUT } = await import("@/app/api/dashboard/route");
    const response = await PUT(new Request("http://localhost/api/dashboard", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "Updated Owner" }),
    }));

    expect(response.status).toBe(200);
    const upsert = mockDb.profile.upsert.mock.calls.at(-1)?.[0];
    expect(upsert.update).not.toHaveProperty("isPublic");
  });

  test("every ordinary-user profile creation path is covered by the private-default contract", () => {
    const root = process.cwd();
    const source = [
      "src/app/api/auth/register/route.ts",
      "src/lib/username-registry.ts",
      "src/lib/ai/conversations.ts",
      "src/app/api/dashboard/route.ts",
      "src/app/api/dashboard/profile/route.ts",
    ].map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");

    expect(source.match(/(?:db|tx)\.profile\.(?:create|upsert)\s*\(/g)).toHaveLength(5);
  });
});
