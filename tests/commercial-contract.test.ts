import {
  AI_CREDIT_ADDONS,
  PLAN_DEFINITIONS,
  getAiCreditAddon,
  getPlanPriceCents,
} from "@/lib/billing/plans";
import {
  AI_ADVANCED_TASK_CREDIT_COST,
  AI_BASIC_TASK_CREDIT_COST,
  AI_STANDARD_REPLY_CREDIT_COST,
} from "@/lib/ai/credits";

describe("Link168 commercial contract", () => {
  test("public individual subscription prices are exact", () => {
    expect(getPlanPriceCents("plus", "monthly")).toBe(6900);
    expect(getPlanPriceCents("plus", "yearly")).toBe(59900);
    expect(getPlanPriceCents("pro", "monthly")).toBe(13900);
    expect(getPlanPriceCents("pro", "yearly")).toBe(99900);
  });

  test("enterprise prices are visible proposals but require sales", () => {
    expect(PLAN_DEFINITIONS.enterprise.priceYearly).toBe(880000);
    expect(PLAN_DEFINITIONS.enterprise.contactSales).toBe(true);
    expect(PLAN_DEFINITIONS.enterprise_pro.priceYearly).toBe(1980000);
    expect(PLAN_DEFINITIONS.enterprise_pro.contactSales).toBe(true);
    expect(getPlanPriceCents("enterprise", "yearly")).toBeNull();
    expect(getPlanPriceCents("enterprise_pro", "yearly")).toBeNull();
  });

  test("monthly points are the only subscription allowance", () => {
    expect(PLAN_DEFINITIONS.free.limits.aiChatsPerMonth).toBe(0);
    expect(PLAN_DEFINITIONS.plus.limits.aiChatsPerMonth).toBe(800);
    expect(PLAN_DEFINITIONS.pro.limits.aiChatsPerMonth).toBe(3000);
    expect(PLAN_DEFINITIONS.enterprise.limits.aiChatsPerMonth).toBe(15000);
    expect(PLAN_DEFINITIONS.enterprise_pro.limits.aiChatsPerMonth).toBe(50000);

    for (const code of ["plus", "pro", "enterprise", "enterprise_pro"] as const) {
      expect(PLAN_DEFINITIONS[code].limits.aiCreditsGrant).toBe(0);
    }
  });

  test("AI task tiers use one, five and twenty points", () => {
    expect(AI_STANDARD_REPLY_CREDIT_COST).toBe(1);
    expect(AI_BASIC_TASK_CREDIT_COST).toBe(5);
    expect(AI_ADVANCED_TASK_CREDIT_COST).toBe(20);
  });

  test("add-on catalog has four twelve-month packs", () => {
    expect(AI_CREDIT_ADDONS.map(({ points, priceCents }) => [points, priceCents])).toEqual([
      [1000, 3900],
      [3000, 9900],
      [10000, 29900],
      [30000, 79900],
    ]);
    expect(AI_CREDIT_ADDONS.every((addon) => addon.validityDays === 365)).toBe(true);
    expect(getAiCreditAddon("ai_points_3000")?.points).toBe(3000);
    expect(getAiCreditAddon("missing")).toBeNull();
  });
});
