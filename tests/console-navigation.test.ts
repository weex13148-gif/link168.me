import fs from "node:fs";
import path from "node:path";
import {
  PRIMARY_NAV_ITEMS,
  SECONDARY_NAV_ITEMS,
  SHARED_NAV_ITEMS,
  SHARED_MOBILE_NAV,
} from "@/components/layout/console-navigation";
import { MAINLINE_PRIMARY_ROUTES } from "@/lib/product/mainline";

const navigationSource = fs.readFileSync(
  path.join(process.cwd(), "src/components/layout/console-navigation.ts"),
  "utf8",
);

describe("Console navigation contract", () => {
  test("React navigation derives labels and hrefs from product facts", () => {
    expect(
      PRIMARY_NAV_ITEMS.map(({ label, href }) => ({ label, href })),
    ).toEqual(
      MAINLINE_PRIMARY_ROUTES.map(({ label, href }) => ({ label, href })),
    );
  });

  test("React navigation structurally derives primary items from product facts", () => {
    expect(navigationSource).toContain("MAINLINE_PRIMARY_ROUTES.map");
    expect(navigationSource).toContain("type MainlineNavId");
    expect(navigationSource).not.toMatch(
      /\bPRIMARY_NAV_ITEMS\s*(?::[^=]+)?=\s*\[/,
    );
  });

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
