import fs from "node:fs";
import path from "node:path";
import {
  MAINLINE_PRIMARY_ROUTES,
  isFuturePlanCode,
  toMainlinePlanLabel,
} from "@/lib/product/mainline";

const root = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

describe("approved SaaS mainline contract", () => {
  test("ordinary users have exactly five primary routes", () => {
    expect(MAINLINE_PRIMARY_ROUTES).toEqual([
      { id: "home", label: "首页", href: "/console" },
      { id: "card", label: "名片", href: "/dashboard" },
      { id: "customers", label: "客户", href: "/workbench/leads" },
      { id: "ai", label: "AI", href: "/workbench/ai" },
      { id: "me", label: "我的", href: "/workbench/account" },
    ]);
  });

  test("top-level AI page is visitor reception", () => {
    const page = read("src/app/workbench/ai/page.tsx");
    expect(page).toContain("ReceptionConfigClient");
    expect(page).not.toContain("AI_ASSISTANT_LIST");
    expect(page).not.toContain("企业版无限额度");
    expect(page).not.toContain("六大专业 AI 助手");
    expect(page).not.toMatch(/2000\s*(次|Credits)/);
  });

  test("legacy and future plans use approved ordinary-user labels", () => {
    expect(toMainlinePlanLabel("free")).toBe("Free");
    expect(toMainlinePlanLabel("member_basic")).toBe("Plus");
    expect(toMainlinePlanLabel("member_plus")).toBe("Plus");
    expect(toMainlinePlanLabel("plus")).toBe("Plus");
    expect(toMainlinePlanLabel("pro")).toBe("Pro");
    expect(toMainlinePlanLabel("enterprise")).toBe("Pro");
    expect(isFuturePlanCode("enterprise")).toBe(true);
    expect(isFuturePlanCode("enterprise_pro")).toBe(true);
  });

  test("repository documents point to the approved specification", () => {
    const readme = read("README.md");
    const current = read("docs/CURRENT_MVP.md");
    expect(readme).toContain(
      "专业商业名片 + 24 小时接待 + 真实 Lead + 轻量跟进",
    );
    expect(current).toContain(
      "2026-07-18-link168-saas-product-mainline-design.md",
    );
    expect(readme).not.toContain(
      "V0.1 does not include membership, payment, AI",
    );
  });

  test("new mainline branch runs MVP Closeout", () => {
    expect(read(".github/workflows/mvp-closeout.yml")).toContain(
      "integration/saas-mainline-v1-20260718",
    );
  });

  test("home and account avoid future-plan and numeric claims", () => {
    const pages = [
      read("src/app/console/page.tsx"),
      read("src/app/workbench/account/page.tsx"),
    ].join("\n");
    expect(pages).toContain("toMainlinePlanLabel");
    expect(pages).not.toContain("企业版");
    expect(pages).not.toMatch(/188|388|2000\s*(次|Credits)/);
  });

  test("home prioritizes publication, leads and next action", () => {
    const home = read("src/app/console/page.tsx");
    expect(home).toContain("发布状态");
    expect(home).toContain("最近客户");
    expect(home).toContain("下一步");
    expect(home).not.toContain("今天是经营的好日子");
  });
});
