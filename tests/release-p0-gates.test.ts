import fs from "fs";
import path from "path";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("P0 release gates", () => {
  test("MVP workflow verifies master and the release-risk integration branch", () => {
    const workflow = read(".github/workflows/mvp-closeout.yml");
    expect(workflow).toMatch(/push:\s*[\s\S]*master/);
    expect(workflow).toContain("integration/release-risk-closeout-20260716");
    expect(workflow).toMatch(/pull_request:\s*[\s\S]*master/);
  });

  test("workflow runs full verification and runtime release gates", () => {
    const workflow = read(".github/workflows/mvp-closeout.yml");
    for (const command of [
      "npm ci",
      "npx prisma validate",
      "npx prisma generate",
      "npx prisma migrate deploy",
      "npm run typecheck",
      "npm run lint",
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
    expect(source).not.toMatch(/console\.log\([^\n]*(process\.env|value)/);
  });

  test("standalone smoke starts the production server and checks homepage, health and assets", () => {
    const source = read("scripts/release/smoke-standalone.js");
    expect(source).toContain(".next/standalone/server.js");
    expect(source).toContain("/api/health");
    expect(source).toContain("/_next/static/");
    expect(source).toContain("/brand/");
    expect(source).toContain("status === 200");
  });
});
