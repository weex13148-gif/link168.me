import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("single-mainline refactor guardrails", () => {
  test("package.json defines each test script once", () => {
    const raw = read("package.json");
    expect((raw.match(/"test"\s*:/g) ?? []).length).toBe(1);
    expect((raw.match(/"test:d2"\s*:/g) ?? []).length).toBe(1);
    expect((raw.match(/"test:d4"\s*:/g) ?? []).length).toBe(1);
  });

  test("Link168 Refactor Gate targets master and the unique refactor branch", () => {
    const workflow = read(".github/workflows/mvp-closeout.yml");
    expect(workflow).toContain("name: Link168 Refactor Gate");
    expect(workflow).toContain("- master");
    expect(workflow).toContain("- refactor/link168-modular-monolith-r1");
    expect(workflow).not.toContain("integration/mvp-closeout-r1");
  });

  test("Link168 Refactor Gate uses Node 22, PostgreSQL 16 and Redis 7", () => {
    const workflow = read(".github/workflows/mvp-closeout.yml");
    expect(workflow).toContain("image: postgres:16");
    expect(workflow).toContain("image: redis:7-alpine");
    expect(workflow).toMatch(/node-version:\s*["']?22["']?/);
    expect(workflow).toContain("pg_isready");
    expect(workflow).toContain("redis-cli ping");
  });

  test("Link168 Refactor Gate runs every hard gate in order", () => {
    const workflow = read(".github/workflows/mvp-closeout.yml");
    const commands = [
      "npm ci",
      "node scripts/refactor/verify-baseline.mjs",
      "npm run check:dependencies",
      "npx prisma validate",
      "npx prisma generate",
      "npx prisma migrate deploy",
      "npm run typecheck",
      "npm run lint",
      "npm test -- --runInBand",
      "npm run build",
      "git diff --check",
    ];

    let previous = -1;
    for (const command of commands) {
      const current = workflow.indexOf(command);
      expect(current).toBeGreaterThan(previous);
      previous = current;
    }
    expect(workflow).not.toContain("continue-on-error");
  });

  test("enterprise pages cannot bypass Host validation", () => {
    const home = read("src/app/%5F_w/[workspaceId]/page.tsx");
    const member = read("src/app/%5F_w/[workspaceId]/p/[slug]/page.tsx");
    const guard = read("src/lib/workspace-public-request.ts");
    expect(home).toContain("requireWorkspacePublicRequestHost");
    expect(member).toContain("requireWorkspacePublicRequestHost");
    expect(guard).toContain("validateWorkspacePublicRequestHost");
    expect(`${home}\n${member}\n${guard}`).not.toMatch(/if\s*\(host\)/);
    expect(`${home}\n${member}\n${guard}`).not.toContain(
      "NEXT_PUBLIC_APP_URL ? null",
    );
  });

  test("AI callers use source-aware compensation", () => {
    const permissions = read("src/lib/ai/permissions.ts");
    const commercial = read("src/lib/ai/commercial-agent.ts");
    const workbench = read("src/app/api/workbench/ai/chat/route.ts");
    expect(permissions).toContain("refundConsumedCredit");
    expect(commercial).toContain("refundConsumedCredit");
    expect(workbench).toContain("refundConsumedCredit");
    expect(`${permissions}\n${commercial}\n${workbench}`).not.toContain(
      "refundCredit",
    );
  });
});
