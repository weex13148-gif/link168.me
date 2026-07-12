import assert from "node:assert/strict";
import test from "node:test";
import {
  CONSOLE_SECTION_ROUTES,
  getConsoleSectionKey,
  isConsoleSectionActive,
} from "./console-route-policy.ts";

test("console primary navigation has exactly five sections in the approved order", () => {
  assert.deepEqual(
    CONSOLE_SECTION_ROUTES.map(({ key, label, href }) => ({ key, label, href })),
    [
      { key: "home", label: "首页", href: "/console" },
      { key: "card", label: "名片", href: "/console/card" },
      { key: "customers", label: "客户", href: "/console/customers" },
      { key: "ai", label: "AI", href: "/console/ai" },
      { key: "account", label: "我的", href: "/console/account" },
    ],
  );
});

test("legacy routes resolve to their approved console section", () => {
  const cases = [
    ["/workbench", "home"],
    ["/dashboard", "card"],
    ["/workbench/products", "card"],
    ["/workbench/short-links", "card"],
    ["/workbench/analytics", "card"],
    ["/workbench/leads", "customers"],
    ["/workbench/ai", "ai"],
    ["/workbench/ai/财税助理", "ai"],
    ["/workbench/ai-service", "ai"],
    ["/workbench/knowledge", "ai"],
    ["/workbench/account", "account"],
    ["/workbench/membership", "account"],
    ["/workbench/enterprise", "account"],
    ["/workbench/notifications", "account"],
  ] as const;

  for (const [pathname, expected] of cases) {
    assert.equal(getConsoleSectionKey(pathname), expected, pathname);
  }
});

test("console routes and nested routes stay active within their own section", () => {
  const ai = CONSOLE_SECTION_ROUTES.find((item) => item.key === "ai");
  assert.ok(ai);
  assert.equal(isConsoleSectionActive("/console/ai", ai), true);
  assert.equal(isConsoleSectionActive("/console/ai/财税助理", ai), true);
  assert.equal(isConsoleSectionActive("/console/account", ai), false);
});

test("jeepwork is never classified as a user console section", () => {
  assert.equal(getConsoleSectionKey("/jeepwork"), null);
  assert.equal(getConsoleSectionKey("/jeepwork/users"), null);
});
