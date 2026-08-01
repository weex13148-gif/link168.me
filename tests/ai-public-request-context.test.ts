import fs from "node:fs";
import path from "node:path";

const mockResolveDomain = jest.fn();
const mockNormalizeRequestHost = jest.fn((host: string) => host.toLowerCase().replace(/:\d+$/, ""));
const mockIsPlatformHost = jest.fn((host: string) => ["link168.me", "www.link168.me"].includes(host));
const mockGetConfiguredAppHost = jest.fn(() => null);

jest.mock("@/lib/domains", () => ({
  normalizeRequestHost: mockNormalizeRequestHost,
  resolveDomain: mockResolveDomain,
}));

jest.mock("@/lib/platform-hosts", () => ({
  getConfiguredAppHost: mockGetConfiguredAppHost,
  isPlatformHost: mockIsPlatformHost,
}));

import { resolvePublicAiRequestContext } from "@/lib/ai/public-request-context";

function request(host: string) {
  return new Request("https://link168.me/api/ai/customer-service", {
    headers: { host },
  });
}

describe("public AI request context", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNormalizeRequestHost.mockImplementation((host: string) => host.toLowerCase().replace(/:\d+$/, ""));
    mockIsPlatformHost.mockImplementation((host: string) => ["link168.me", "www.link168.me"].includes(host));
    mockGetConfiguredAppHost.mockReturnValue(null);
  });

  test("platform personal page has an explicit null workspace context", async () => {
    mockResolveDomain.mockResolvedValue(null);

    await expect(resolvePublicAiRequestContext(request("link168.me"), "owner")).resolves.toEqual({
      ok: true,
      expectedWorkspaceId: null,
    });
  });

  test("verified custom domain resolves the expected workspace", async () => {
    mockResolveDomain.mockResolvedValue({
      kind: "workspace",
      workspaceId: "workspace-1",
      workspaceSlug: "team-one",
    });

    await expect(resolvePublicAiRequestContext(request("team.example.com"), "owner")).resolves.toEqual({
      ok: true,
      expectedWorkspaceId: "workspace-1",
    });
  });

  test("personal subdomain cannot request another profile", async () => {
    mockResolveDomain.mockResolvedValue({
      kind: "personal-subdomain",
      userId: "user-1",
      username: "owner",
    });

    const result = await resolvePublicAiRequestContext(request("owner.link168.me"), "another-owner");
    expect(result).toMatchObject({ ok: false, code: "PUBLIC_CONTEXT_UNVERIFIED" });
  });

  test("unverified custom Host fails closed", async () => {
    mockResolveDomain.mockResolvedValue(null);

    const result = await resolvePublicAiRequestContext(request("forged.example.com"), "owner");
    expect(result).toMatchObject({ ok: false, code: "PUBLIC_CONTEXT_UNVERIFIED" });
  });

  test("every public commercial AI route verifies and forwards the context", () => {
    for (const route of ["customer-service", "sales-agent", "conversion-agent"]) {
      const content = fs.readFileSync(
        path.join(process.cwd(), `src/app/api/ai/${route}/route.ts`),
        "utf8",
      );
      expect(content).toContain("resolvePublicAiRequestContext(request, body.username)");
      expect(content).toContain("body, context");
      expect(content).toContain("if (!context.ok)");
    }
  });
});
