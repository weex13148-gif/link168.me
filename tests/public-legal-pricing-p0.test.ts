import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("P0 public legal and pricing rules", () => {
  test("public footer exposes operator, ICP, contact, report and core agreements", () => {
    const footer = read("src/components/SiteFooter.tsx");
    expect(footer).toContain("COMPANY_NAME");
    expect(footer).toContain("ICP_NUMBER");
    for (const route of [
      "/contact",
      "/report",
      "/terms",
      "/privacy",
      "/membership-agreement",
      "/refund-policy",
      "/ai-disclaimer",
    ]) {
      expect(footer).toContain(route);
    }
  });

  test("support channel uses the published company mailbox", () => {
    const meta = read("src/lib/legal/meta.ts");
    expect(meta).toContain('SUPPORT_EMAIL: string = "business@link168.me"');
  });

  test.each([
    "src/app/workbench/membership/page.tsx",
    "src/app/pricing/page.tsx",
  ])("purchase confirmation in %s requires visible agreement acknowledgement", (file) => {
    const source = read(file);
    expect(source).toContain("acceptedLegalTerms");
    expect(source).toContain("我已阅读并同意");
    expect(source).toContain('href="/membership-agreement"');
    expect(source).toContain('href="/refund-policy"');
    expect(source).toContain('href="/ai-disclaimer"');
    expect(source).toMatch(/disabled=\{[^}]*!acceptedLegalTerms/);
  });

  test("homepage avoids unprovable absolute opportunity claims", () => {
    const homepage = read("src/app/page.tsx");
    expect(homepage).not.toContain("不漏掉任何一次商机");
    expect(homepage).not.toMatch(/保证获客|保证收益|全网第一|行业第一|永久免费|自动成交/);
  });

  test("refund FAQ links to the formal refund rule instead of vague terms", () => {
    const pricing = read("src/app/pricing/page.tsx");
    expect(pricing).toContain('href="/refund-policy"');
    expect(pricing).not.toContain('a: "退款政策以服务条款为准。"');
  });
});
