const mockProfileFindUnique = jest.fn();
const mockProfileFindFirst = jest.fn();
const mockReadFile = jest.fn();
const mockGetCurrentUserFromRequest = jest.fn();
const mockGetActiveRestrictions = jest.fn();
const mockCanShowPublicProfile = jest.fn();

jest.mock("fs/promises", () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
  readdir: jest.fn(),
  stat: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  db: {
    profile: {
      findUnique: (...args: unknown[]) => mockProfileFindUnique(...args),
      findFirst: (...args: unknown[]) => mockProfileFindFirst(...args),
    },
  },
}));

jest.mock("@/lib/domains", () => ({
  resolveDomain: jest.fn(),
  WORKSPACE_RESERVED_SLUGS: new Set(),
}));

jest.mock("@/lib/auth", () => ({
  getCurrentUserFromRequest: (...args: unknown[]) => mockGetCurrentUserFromRequest(...args),
  getActiveRestrictions: (...args: unknown[]) => mockGetActiveRestrictions(...args),
  canShowPublicProfile: (...args: unknown[]) => mockCanShowPublicProfile(...args),
}));

jest.mock("@/lib/upload-storage", () => ({
  getAvatarUploadDir: () => "/tmp/avatars",
  getAvatarContentType: () => "image/png",
  getLegacyAvatarDirs: () => ["/tmp/avatars"],
  isSafeAvatarFileName: () => true,
}));

function profile(overrides: Record<string, unknown> = {}) {
  return {
    userId: "owner-1",
    isPublic: false,
    avatarUrl: "/uploads/alice.png",
    updatedAt: new Date("2026-07-18T00:00:00.000Z"),
    avatarModerationStatus: "approved",
    user: { emailVerified: true },
    ...overrides,
  };
}

async function getAvatar() {
  const { GET } = await import("@/app/api/avatar/[username]/route");
  return GET(
    new Request("http://localhost/api/avatar/alice"),
    { params: Promise.resolve({ username: "alice" }) },
  );
}

async function getLegacyAvatar() {
  const { GET } = await import("@/app/api/avatar/legacy/[filename]/route");
  return GET(
    new Request("http://localhost/api/avatar/legacy/alice.png"),
    { params: Promise.resolve({ filename: "alice.png" }) },
  );
}

describe("avatar publication consent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadFile.mockResolvedValue(Buffer.from("avatar"));
    mockGetCurrentUserFromRequest.mockResolvedValue(null);
    mockGetActiveRestrictions.mockResolvedValue([]);
    mockCanShowPublicProfile.mockReturnValue({ ok: true });
  });

  test("an anonymous request cannot read an unpublished avatar", async () => {
    mockProfileFindUnique.mockResolvedValue(profile());

    const response = await getAvatar();

    expect(response.status).toBe(404);
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  test("the owner can preview an unpublished avatar without creating a public cache entry", async () => {
    mockProfileFindUnique.mockResolvedValue(profile());
    mockGetCurrentUserFromRequest.mockResolvedValue({ id: "owner-1" });

    const response = await getAvatar();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  test("a visible published avatar remains public and cacheable", async () => {
    mockProfileFindUnique.mockResolvedValue(profile({ isPublic: true }));

    const response = await getAvatar();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=86400, must-revalidate");
  });

  test("an anonymous request cannot read a published avatar before email verification", async () => {
    mockProfileFindUnique.mockResolvedValue(profile({
      isPublic: true,
      user: { emailVerified: false },
    }));

    const response = await getAvatar();

    expect(response.status).toBe(404);
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  test("an anonymous request cannot read an access-restricted published avatar", async () => {
    mockProfileFindUnique.mockResolvedValue(profile({ isPublic: true }));
    mockGetActiveRestrictions.mockResolvedValue([{ type: "ADMIN_FREEZE" }]);
    mockCanShowPublicProfile.mockReturnValue({ ok: false, reason: "ADMIN_FREEZE" });

    const response = await getAvatar();

    expect(response.status).toBe(404);
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  test("the proxy routes a legacy public avatar path through access control", async () => {
    const { NextRequest } = await import("next/server");
    const { proxy } = await import("@/proxy");

    const response = await proxy(new NextRequest(
      "http://localhost/uploads/avatars/alice.png",
      { headers: { host: "localhost" } },
    ));

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://localhost/api/avatar/legacy/alice.png",
    );
  });

  test("the controlled legacy route blocks an unpublished avatar", async () => {
    mockProfileFindFirst.mockResolvedValue(profile());

    const response = await getLegacyAvatar();

    expect(response.status).toBe(404);
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  test("the controlled legacy route serves a visible published avatar", async () => {
    mockProfileFindFirst.mockResolvedValue(profile({ isPublic: true }));

    const response = await getLegacyAvatar();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=86400, must-revalidate");
  });
});
