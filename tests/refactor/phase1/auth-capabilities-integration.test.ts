import fs from "node:fs";

const authSource = fs.readFileSync("src/lib/auth.ts", "utf8");
const loginSource = fs.readFileSync("src/app/api/auth/login/route.ts", "utf8");
const dashboardSource = fs.readFileSync("src/app/api/dashboard/route.ts", "utf8");

function between(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
}

describe("Phase 1 capability-backed ordinary authentication", () => {
  test("session users carry account status and inactive sessions fail closed", () => {
    expect(authSource).toContain('accountStatus: string;');
    expect(authSource).toMatch(/select:\s*\{[\s\S]*accountStatus:\s*true/);
    expect(authSource).toContain('if (session.user.accountStatus !== "active") return null;');
    expect(authSource).toContain('accountStatus: session.user.accountStatus');
  });

  test("one access context loads restrictions and evaluates capabilities", () => {
    expect(authSource).toContain('evaluateAccountCapabilities');
    expect(authSource).toContain('export async function getAccountAccessContextForUser');
    expect(authSource).toContain('restrictionTypes: restrictions.map((restriction) => restriction.type)');
    expect(authSource).toContain('export async function getAccountCapabilitiesForUser');
  });

  test("dashboard and sensitive guards delegate to capabilities", () => {
    const dashboardGuard = between(
      authSource,
      'export async function requireDashboardUser',
      'export async function requireActiveUser',
    );
    expect(dashboardGuard).toContain('if (!capabilities.canEnterDashboard)');
    expect(dashboardGuard).not.toContain('const hardBlock = restrictions.find');
    expect(authSource).toContain('if (!dashboard.capabilities?.canModifySensitiveData)');
  });

  test("login uses the shared access context instead of a separate account decision tree", () => {
    expect(loginSource).toContain('getAccountAccessContextForUser');
    expect(loginSource).toContain('if (!capabilities.canLogin)');
    expect(loginSource).toContain('capabilities.blockedBy');
    expect(loginSource).not.toContain('user.accountStatus === "deactivated"');
    expect(loginSource).not.toContain('canUserLogin(restrictions)');
  });

  test("dashboard response publishes the evaluated capability object", () => {
    expect(dashboardSource).toMatch(/requireDashboardUser\(request\)[\s\S]*capabilities/);
    expect(dashboardSource).toContain('capabilities,');
    expect(dashboardSource).not.toContain('syncEmailVerificationRestriction(user.id)');
  });
});
