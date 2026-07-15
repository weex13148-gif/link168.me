import {
  PRIMARY_NAV_ITEMS,
  SECONDARY_NAV_ITEMS,
  SHARED_NAV_ITEMS,
  SHARED_MOBILE_NAV,
} from "@/components/layout/console-navigation";

describe("Console navigation contract", () => {
  test("PRIMARY_NAV_ITEMS must have exactly 5 entries", () => {
    expect(PRIMARY_NAV_ITEMS).toHaveLength(5);
  });

  test("PRIMARY_NAV_ITEMS order: 首页, 名片, 客户, AI, 我的", () => {
    const labels = PRIMARY_NAV_ITEMS.map((i) => i.label);
    expect(labels).toEqual(["首页", "名片", "客户", "AI", "我的"]);
  });

  test("SHARED_MOBILE_NAV must match PRIMARY_NAV_ITEMS", () => {
    expect(SHARED_MOBILE_NAV).toEqual(PRIMARY_NAV_ITEMS);
  });

  test("mobile fourth item must be AI", () => {
    expect(SHARED_MOBILE_NAV[3].label).toBe("AI");
    expect(SHARED_MOBILE_NAV[3].href).toBe("/workbench/ai");
  });

  test("no enterprise entry in primary nav", () => {
    const hasEnterprise = PRIMARY_NAV_ITEMS.some((i) =>
      i.href.includes("enterprise"),
    );
    expect(hasEnterprise).toBe(false);
  });

  test("no jeepwork or showcase in any nav", () => {
    for (const list of [PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS]) {
      for (const item of list) {
        expect(item.href).not.toMatch(/jeepwork|showcase/);
      }
    }
  });

  test("SHARED_NAV_ITEMS contains no fake growth numbers", () => {
    // Navigation itself should never reference demo/fake data endpoints
    for (const item of SHARED_NAV_ITEMS) {
      expect(item.href).not.toMatch(/demo|fake|mock|sample/);
    }
  });
});
