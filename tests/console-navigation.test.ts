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

  test("PRIMARY_NAV_ITEMS order: 概览, 名片, 客户, 经营数据, AI 接待", () => {
    const labels = PRIMARY_NAV_ITEMS.map((i) => i.label);
    expect(labels).toEqual(["概览", "名片", "客户", "经营数据", "AI 接待"]);
  });

  test("SHARED_MOBILE_NAV keeps four direct actions before More", () => {
    expect(SHARED_MOBILE_NAV).toHaveLength(4);
    expect(SHARED_MOBILE_NAV.map((item) => item.label)).toEqual([
      "概览",
      "名片",
      "客户",
      "账号",
    ]);
  });

  test("mobile fourth item is account", () => {
    expect(SHARED_MOBILE_NAV[3].label).toBe("账号");
    expect(SHARED_MOBILE_NAV[3].href).toBe("/console/account");
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

  test("every user navigation target belongs to the console", () => {
    for (const item of SHARED_NAV_ITEMS) {
      expect(item.href).toMatch(/^\/console(?:\/|$)/);
    }
  });

  test("SHARED_NAV_ITEMS contains no fake growth numbers", () => {
    // Navigation itself should never reference demo/fake data endpoints
    for (const item of SHARED_NAV_ITEMS) {
      expect(item.href).not.toMatch(/demo|fake|mock|sample/);
    }
  });
});
