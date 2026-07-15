import fs from "fs";
import path from "path";

const root = path.join(__dirname, "..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("Showcase and Jeepwork release closeout", () => {
  test("showcase publishes the verified company identity without legacy placeholders", () => {
    const source = read("src/lib/showcase-config.ts");
    const layout = read("src/components/showcase/ShowcaseLayout.tsx");
    const companyLogoPath = path.join(root, "public", "company", "zaomeng-hubble-logo.webp");

    expect(source).toContain("合肥造梦哈勃文化传媒有限公司");
    expect(source).toContain("91340104MADEECUN15");
    expect(source).toContain("齐帅");
    expect(source).toContain("人民币 5 万元");
    expect(source).toContain("2024年4月1日");
    expect(source).toContain("安徽省合肥市蜀山区");
    expect(source).toContain("皖ICP备2026018031号-1");
    expect(source).toContain("business@link168.me");
    expect(source).toContain("/company/zaomeng-hubble-logo.webp");
    expect(fs.existsSync(companyLogoPath)).toBe(true);
    expect(layout).toContain("SHOWCASE_PROJECT.company.logoUrl");
    expect(layout).toContain("SHOWCASE_PROJECT.company.name");
    expect(layout).toContain("SHOWCASE_PROJECT.icp");

    expect(source).not.toMatch(/未备案|待补充主体名称|每日重置数据/);
    expect(source).not.toContain('username: "demo"');
    expect(source).not.toContain("demoAccount");
  });

  test("showcase distinguishes code completion from production validation", () => {
    const source = read("src/lib/showcase-config.ts");

    expect(source).toContain('"pending_validation"');
    expect(source).toContain("待生产配置验证");
    expect(source).toContain('href: "/console"');
    expect(source).not.toContain('entry: "Dashboard /dashboard"');
    expect(source).not.toContain('entry: "/enterprise-ai"');
    expect(source).not.toContain("支付宝沙箱支付闭环已验证通过");
  });

  test("showcase password session is persistent and invalidates on password rotation", () => {
    const showcaseLib = read("src/lib/showcase.ts");
    const sessionRoute = read("src/app/api/showcase/session/route.ts");

    expect(showcaseLib).toContain("createShowcaseCookieValue(config.passwordHash)");
    expect(sessionRoute).toContain("export async function GET");
    expect(sessionRoute).toContain("hasValidShowcaseCookie");
    expect(sessionRoute).toContain("SHOWCASE_COOKIE_MAX_AGE");
    expect(sessionRoute).toContain("10 * 365 * 24 * 60 * 60");
    expect(sessionRoute).not.toContain("8 * 60 * 60");
    expect(sessionRoute).not.toMatch(/rateLimit|wrongPasswordCount|tooManyAttempts/i);
  });

  test("Jeepwork exposes one competition center and redirects the legacy page", () => {
    const navigation = read("src/lib/jeepwork-navigation.ts");
    const legacyPage = read("src/app/jeepwork/showcase/page.tsx");
    const matches = navigation.match(/href: "\/jeepwork\/competition-center"/g) ?? [];

    expect(matches).toHaveLength(1);
    expect(navigation).not.toContain('href: "/jeepwork/showcase"');
    expect(legacyPage).toContain('redirect("/jeepwork/competition-center?tab=files")');
  });

  test("historical admin accounts remain queryable but cannot be newly assigned", () => {
    const usersRoute = read("src/app/api/jeepwork/users/route.ts");
    const rolesPage = read("src/app/jeepwork/roles/page.tsx");
    const permissions = read("src/lib/admin-governance/permissions.ts");

    expect(usersRoute).toContain("normalizeQueryRole");
    expect(usersRoute).toContain("normalizeAssignableRole");
    expect(usersRoute).toContain('raw === "admin"');
    expect(usersRoute).toContain('raw === "super_admin" || raw === "user"');
    expect(rolesPage).toContain("历史管理员账号");
    expect(rolesPage).not.toContain("拥有运营权限");
    expect(permissions).toContain('admin: "历史管理员"');
    expect(permissions).toContain("admin: []");
  });
});
