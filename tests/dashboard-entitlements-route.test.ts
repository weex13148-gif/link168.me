const mockRequireDashboardUser = jest.fn();
const mockGetUserEntitlements = jest.fn();

jest.mock("@/lib/auth", () => ({
  requireDashboardUser: mockRequireDashboardUser,
}));

jest.mock("@/lib/billing/entitlements", () => ({
  getUserEntitlements: mockGetUserEntitlements,
}));

import { GET } from "@/app/api/dashboard/entitlements/route";
import fs from "fs";
import path from "path";

describe("dashboard entitlements route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireDashboardUser.mockResolvedValue({
      user: { id: "user-1" },
      response: null,
    });
  });

  it("keeps legacy paid subscriptions usable in the dashboard", async () => {
    mockGetUserEntitlements.mockResolvedValue({
      hasActiveMembership: false,
      isLegacyActive: true,
      isGracePeriod: false,
      gracePeriodDays: 0,
      planCode: "pro",
      plan: {
        name: "Pro 年付",
      },
      currentPeriodStart: null,
      currentPeriodEnd: null,
      daysRemaining: 0,
      features: {
        aiEnabled: true,
        removeBranding: true,
      },
      limits: {
        products: { max: 30, remaining: 30 },
        knowledgeDocs: { max: 100, remaining: 100 },
        aiChatsPerMonth: { max: 2000, used: 0, remaining: 2000 },
        teamSeats: { max: 1 },
      },
    });

    const response = await GET(new Request("http://localhost/api/dashboard/entitlements"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe("legacy_active");
    expect(body.data.isLegacyActive).toBe(true);
    expect(body.data.isPaid).toBe(true);
  });

  it("keeps legacy paid subscriptions usable when creating or editing paid modules", () => {
    const createRoute = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/dashboard/links/route.ts"),
      "utf8",
    );
    const updateRoute = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/dashboard/links/[id]/route.ts"),
      "utf8",
    );

    for (const source of [createRoute, updateRoute]) {
      expect(source).toContain(
        "!entitlements.hasActiveMembership && !entitlements.isLegacyActive && !entitlements.isGracePeriod",
      );
    }
  });
});
