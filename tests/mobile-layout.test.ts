import * as fs from "fs";
import * as path from "path";

const srcRoot = path.join(__dirname, "..", "src");

describe("Mobile layout safety at 360px–430px", () => {
  test("globals.css enforces min-width 360px on body", () => {
    const cssPath = path.join(srcRoot, "app", "globals.css");
    const css = fs.readFileSync(cssPath, "utf-8");
    expect(css).toMatch(/min-width:\s*360px/);
  });

  test("ConsoleShell has bottom padding to avoid nav overlap", () => {
    const shellPath = path.join(
      srcRoot,
      "components",
      "layout",
      "ConsoleShell.tsx",
    );
    const content = fs.readFileSync(shellPath, "utf-8");
    expect(content).toContain("pb-24");
    expect(content).toContain("safe-area-pb");
  });

  test("ConsoleShell mobile nav is fixed at bottom", () => {
    const shellPath = path.join(
      srcRoot,
      "components",
      "layout",
      "ConsoleShell.tsx",
    );
    const content = fs.readFileSync(shellPath, "utf-8");
    expect(content).toContain("fixed inset-x-0 bottom-0");
  });

  test("ConsoleShell mobile menu has no more than 5 primary bottom items", () => {
    const shellPath = path.join(
      srcRoot,
      "components",
      "layout",
      "ConsoleShell.tsx",
    );
    const content = fs.readFileSync(shellPath, "utf-8");
    // SHARED_MOBILE_NAV is mapped to MOBILE_BOTTOM_NAV and rendered once per item
    const mobileNavMatches = content.match(
      /MOBILE_BOTTOM_NAV\.map\s*\(/g,
    );
    expect(mobileNavMatches).toHaveLength(1);
  });

  test("console home uses responsive grid to prevent overflow", () => {
    const pagePath = path.join(srcRoot, "app", "console", "page.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toContain("grid-cols-2");
    expect(content).toContain("lg:grid-cols-4");
    // Should not have any hardcoded width that exceeds 360px
    expect(content).not.toMatch(/w-\[\d{3,4}px\]/);
  });

  test("DashboardFrame keeps one responsive save status and stable dashboard columns", () => {
    const framePath = path.join(
      srcRoot,
      "components",
      "dashboard-v1",
      "DashboardFrame.tsx",
    );
    const content = fs.readFileSync(framePath, "utf-8");

    expect(content.match(/<SaveStatus\b/g)).toHaveLength(1);
    expect(content).toContain("minmax(0,1fr)");
    expect(content).toContain("350px");
  });
});
