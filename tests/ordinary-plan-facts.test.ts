import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { UpgradeDialog } from "@/components/dashboard-v1/UpgradeDialog";
import ConsoleShell from "@/components/layout/ConsoleShell";

const mockGetUserEntitlements = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => "/workbench/ai",
}));

jest.mock("@/lib/auth", () => ({
  requireDashboardUser: jest.fn(async () => ({
    user: { id: "user-1", email: "owner@example.com" },
    response: null,
  })),
}));

jest.mock("@/lib/billing/entitlements", () => ({
  getUserEntitlements: (...args: unknown[]) => mockGetUserEntitlements(...args),
}));

function visibleText(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:nbsp|amp|quot|#x27);/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function entitlementFixture(planCode: string, planName: string) {
  return {
    planCode,
    plan: { name: planName },
    isLegacyActive: false,
    hasActiveMembership: true,
    isGracePeriod: false,
    gracePeriodDays: 0,
    daysRemaining: 20,
    currentPeriodStart: new Date("2026-07-01T00:00:00.000Z"),
    currentPeriodEnd: new Date("2026-08-01T00:00:00.000Z"),
    features: { removeBranding: false },
    limits: {
      products: { max: 1, used: 0, remaining: 1 },
      knowledgeDocs: { max: 1, used: 0, remaining: 1 },
      aiChatsPerMonth: { max: 1, used: 0, remaining: 1 },
      teamSeats: { max: 1, used: 0, remaining: 1 },
    },
  };
}

describe("ordinary-user canonical plan facts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("open upgrade dialog renders only Free, Plus and Pro with truthful availability", () => {
    const html = renderToStaticMarkup(createElement(UpgradeDialog, {
      open: true,
      onClose: () => undefined,
    }));
    const text = visibleText(html);

    expect(text).toContain("Free");
    expect(text).toContain("Plus");
    expect(text).toContain("Pro");
    expect(text).not.toMatch(/Enterprise|企业/i);
    expect(text).not.toMatch(/\d+\s*(?:元|次|credits?|额度|\/年|\/月)/i);
    expect(text).not.toContain("支付宝");
    expect(text.match(/价格、权益与支付核验中/g)).toHaveLength(2);
    expect(text).not.toContain("查看收费方案");
    expect(html).not.toContain('href="/workbench/membership"');
  });

  test.each([
    ["enterprise", "企业版", "Pro"],
    ["member_basic", "旧会员版", "Plus"],
    ["free", "免费版", "Free"],
  ])("entitlements normalizes %s (%s) to %s", async (planCode, planName, canonical) => {
    mockGetUserEntitlements.mockResolvedValue(entitlementFixture(planCode, planName));
    const { GET } = await import("@/app/api/dashboard/entitlements/route");

    const response = await GET(new Request("http://localhost/api/dashboard/entitlements"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.planName).toBe(canonical);
    expect(body.data.planLabel).toBe(canonical);
  });

  test("console shell uses the approved AI reception group label", () => {
    const html = renderToStaticMarkup(createElement(ConsoleShell, {
      title: "控制台",
      children: createElement("p", null, "Reception"),
    }));
    const shellSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/layout/ConsoleShell.tsx"),
      "utf8",
    );

    expect(visibleText(html)).not.toContain("AI 与企业");
    expect(shellSource).toContain('ai: "AI 接待"');
    expect(shellSource).not.toContain('ai: "AI 与企业"');
  });
});
