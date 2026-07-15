import fs from "fs";
import path from "path";
import { JEEPWORK_NAV_GROUPS } from "@/lib/jeepwork-navigation";
import { ROLE_ROUTE_ACCESS } from "@/lib/admin-governance/permissions";

const root = path.join(__dirname, "..");

function pagePathFor(href: string) {
  const relative = href === "/jeepwork" ? "jeepwork" : href.replace(/^\//, "");
  return path.join(root, "src", "app", relative, "page.tsx");
}

describe("Jeepwork visible route closure", () => {
  const visibleItems = JEEPWORK_NAV_GROUPS.flatMap((group) => group.items);

  test("every visible entry is explicitly super_admin-only", () => {
    expect(visibleItems.length).toBeGreaterThan(0);
    expect(visibleItems.every((item) => item.requiredRole === "super_admin")).toBe(true);
    expect(ROLE_ROUTE_ACCESS.admin).toEqual([]);
    expect(ROLE_ROUTE_ACCESS.user).toEqual([]);
  });

  test("every visible href resolves to a page using the shared auth endpoint", () => {
    for (const item of visibleItems) {
      const pagePath = pagePathFor(item.href);
      expect(fs.existsSync(pagePath)).toBe(true);
      expect(fs.readFileSync(pagePath, "utf8")).toContain("/api/jeepwork/auth/me");
    }

    const authRoute = fs.readFileSync(
      path.join(root, "src", "app", "api", "jeepwork", "auth", "me", "route.ts"),
      "utf8",
    );
    expect(authRoute).toContain("getJeepworkSessionUser");
  });

  test("unfinished pages stay in the codebase but are hidden from release navigation", () => {
    const visibleHrefs = visibleItems.map((item) => item.href);
    expect(visibleHrefs).not.toContain("/jeepwork/ai-cost");
    expect(visibleHrefs).not.toContain("/jeepwork/governance");
    expect(fs.existsSync(pagePathFor("/jeepwork/ai-cost"))).toBe(true);
    expect(fs.existsSync(pagePathFor("/jeepwork/governance"))).toBe(true);
  });

  test("visible navigation contains no release-placeholder wording", () => {
    const labels = JEEPWORK_NAV_GROUPS.flatMap((group) => [
      group.label,
      ...group.items.map((item) => item.label),
    ]).join(" ");
    expect(labels).not.toMatch(/开发中|Demo|Mock|即将开放/i);
  });

  test("the shared shell never renders platform content for a non-super-admin role", () => {
    const shell = fs.readFileSync(
      path.join(root, "src", "components", "admin", "AdminShell.tsx"),
      "utf8",
    );
    expect(shell).toContain('currentUserRole !== "super_admin"');
  });
});
