import * as fs from "fs";
import * as path from "path";

const srcRoot = path.join(__dirname, "..", "src");

describe("Legacy route compatibility", () => {
  test("/workbench root redirects to /console", () => {
    const workbenchPage = path.join(srcRoot, "app", "workbench", "page.tsx");
    expect(fs.existsSync(workbenchPage)).toBe(true);
    const content = fs.readFileSync(workbenchPage, "utf-8");
    expect(content).toContain('redirect("/console")');
  });

  test("/dashboard page is a compatibility redirect", () => {
    const dashboardPage = path.join(srcRoot, "app", "dashboard", "page.tsx");
    expect(fs.existsSync(dashboardPage)).toBe(true);
    const content = fs.readFileSync(dashboardPage, "utf-8");
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain("resolveLegacyConsoleRoute");
    expect(content).not.toContain("DashboardV1Client");
  });

  test("/console page exists as the sole user shell", () => {
    const consolePage = path.join(srcRoot, "app", "console", "page.tsx");
    expect(fs.existsSync(consolePage)).toBe(true);
    const content = fs.readFileSync(consolePage, "utf-8");
    expect(content.length).toBeGreaterThan(0);
  });

  test("no independent workbench home shell remains", () => {
    // WorkbenchShell should now be a thin wrapper around ConsoleShell
    const workbenchShell = path.join(
      srcRoot,
      "components",
      "workbench",
      "WorkbenchShell.tsx",
    );
    const content = fs.readFileSync(workbenchShell, "utf-8");
    expect(content).toContain("ConsoleShell");
    // It must not define its own navigation arrays or layout markup
    expect(content).not.toContain("SHARED_NAV_ITEMS");
    expect(content).not.toContain("MOBILE_BOTTOM_NAV");
  });
});
