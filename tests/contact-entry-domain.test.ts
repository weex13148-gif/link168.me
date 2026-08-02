import {
  isAllowedPersonalContactHost,
  isPrismaUniqueConflict,
  isUuid,
  summarizeWorkspacePublicHost,
} from "@/lib/contact-entry-domain";

describe("team contact entry public host summary", () => {
  test("validates route UUIDs before they reach PostgreSQL UUID columns", () => {
    expect(isUuid("11111111-1111-4111-8111-111111111111")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid(123)).toBe(false);
  });

  test("recognizes Prisma unique conflicts without treating arbitrary errors as duplicates", () => {
    expect(isPrismaUniqueConflict({ code: "P2002" })).toBe(true);
    expect(isPrismaUniqueConflict({ code: "P2025" })).toBe(false);
    expect(isPrismaUniqueConflict(null)).toBe(false);
  });

  test("personal contact entries reject workspace and other-user Host confusion", () => {
    expect(isAllowedPersonalContactHost("link168.me", "alice")).toBe(true);
    expect(isAllowedPersonalContactHost("alice.link168.me", "alice")).toBe(true);
    expect(isAllowedPersonalContactHost("bob.link168.me", "alice")).toBe(false);
    expect(isAllowedPersonalContactHost("brand.example.com", "alice")).toBe(false);
    expect(isAllowedPersonalContactHost(null, "alice")).toBe(false);
  });

  test("personal contact entries accept the explicitly configured testnet Host", () => {
    const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://link168-test.vercel.app";
    try {
      expect(isAllowedPersonalContactHost("link168-test.vercel.app", "alice")).toBe(true);
    } finally {
      if (previousAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
    }
  });

  test("personal contact entries accept explicitly configured localhost", () => {
    const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    try {
      expect(isAllowedPersonalContactHost("localhost", "alice")).toBe(true);
    } finally {
      if (previousAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
    }
  });

  test("returns missing when no custom domain is bound", () => {
    expect(summarizeWorkspacePublicHost([])).toEqual({ publicHost: null, publicHostStatus: "missing" });
  });

  test("keeps a pending domain non-shareable", () => {
    expect(summarizeWorkspacePublicHost([{ domain: "team.example.com", status: "pending" }]))
      .toEqual({ publicHost: null, publicHostStatus: "pending" });
  });

  test("reports a failed domain without exposing it as a public host", () => {
    expect(summarizeWorkspacePublicHost([{ domain: "team.example.com", status: "failed" }]))
      .toEqual({ publicHost: null, publicHostStatus: "failed" });
  });

  test("uses the first verified domain supplied by the server", () => {
    expect(summarizeWorkspacePublicHost([
      { domain: "new.example.com", status: "verified" },
      { domain: "old.example.com", status: "verified" },
      { domain: "waiting.example.com", status: "pending" },
    ])).toEqual({ publicHost: "new.example.com", publicHostStatus: "verified" });
  });
});
