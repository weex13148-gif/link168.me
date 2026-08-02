import fs from "fs";
import path from "path";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("P0 release gates", () => {
  test("the only workflow verifies the release branch and pull requests to master", () => {
    const workflowFiles = fs
      .readdirSync(path.join(root, ".github", "workflows"))
      .filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"));
    const workflow = read(".github/workflows/mvp-closeout.yml");

    expect(workflowFiles).toEqual(["mvp-closeout.yml"]);
    expect(workflow).toContain("name: Link168 SaaS Full Gates");
    expect(workflow).toMatch(/push:\s*[\s\S]*master/);
    expect(workflow).toContain("recovery/direct-goal-closeout-20260722");
    expect(workflow).toMatch(/pull_request:\s*[\s\S]*master/);

    for (const retiredBranch of [
      "integration/",
      "agent/p0-",
      "release/internal-test-20260630",
    ]) {
      expect(workflow).not.toContain(retiredBranch);
    }
  });

  test("workflow runs full verification and runtime release gates", () => {
    const workflow = read(".github/workflows/mvp-closeout.yml");
    for (const command of [
      "npm ci",
      "npx prisma validate",
      "npx prisma generate",
      "npx prisma migrate deploy",
      "npm run lint",
      "npm run typecheck",
      "npm test -- --runInBand",
      "npm run build",
      "npm run release:preflight",
      "npm run release:smoke",
      "git diff --check",
    ]) {
      expect(workflow).toContain(command);
    }
  });

  test("package exposes release preflight and standalone smoke commands", () => {
    const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
    expect(packageJson.scripts?.["release:preflight"]).toBe("node scripts/release/preflight.js");
    expect(packageJson.scripts?.["release:smoke"]).toBe("node scripts/release/smoke-standalone.js");
  });

  test("preflight checks required production variable names without printing values", () => {
    const source = read("scripts/release/preflight.js");
    for (const name of [
      "DATABASE_URL",
      "SESSION_SECRET",
      "ADMIN_SECRET",
      "CONFIG_ENCRYPTION_KEY",
      "NEXT_PUBLIC_APP_URL",
      "PAYMENT_RECONCILE_SECRET",
    ]) {
      expect(source).toContain(name);
    }
    expect(source).toContain("AUTH_RATE_LIMIT_BYPASS");
    expect(source).toContain("new URL(appUrl)");
    expect(source).toContain("must be a bare origin");
    expect(source).not.toMatch(/console\.log\([^\n]*(process\.env|value)/);
  });

  test("standalone smoke starts the packaged production server and checks homepage assets", () => {
    const source = read("scripts/release/smoke-standalone.js");
    expect(source).toContain(".next/standalone/server.js");
    expect(source).toContain('request("/")');
    expect(source).toContain("RELEASE_SMOKE_REQUIRE_DB");
    expect(source).toContain('request("/api/health")');
    expect(source).toContain("/_next/static/");
    expect(source).toContain("/brand/");
    expect(source).toContain("requireRuntimeDirectory");
    expect(source).not.toContain("fs.cpSync");
    expect(source).toContain("status === 200");
  });

  test("CI validates production settings and database health", () => {
    const workflow = read(".github/workflows/mvp-closeout.yml");
    expect(workflow).toMatch(/Release preflight[\s\S]*NODE_ENV:\s*production/);
    expect(workflow).toMatch(/Standalone runtime smoke[\s\S]*RELEASE_SMOKE_REQUIRE_DB:\s*["']true["']/);
    expect(workflow).toContain("NEXT_PUBLIC_APP_URL: https://example.invalid");
    expect(workflow).toContain('COOKIE_SECURE: "true"');
  });
});
