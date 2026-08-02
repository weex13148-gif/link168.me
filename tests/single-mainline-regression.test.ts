import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("single-mainline closeout guardrails", () => {
  test("package.json defines each test script once", () => {
    const raw = read("package.json");
    expect((raw.match(/"test"\s*:/g) ?? []).length).toBe(1);
    expect((raw.match(/"test:d2"\s*:/g) ?? []).length).toBe(1);
    expect((raw.match(/"test:d4"\s*:/g) ?? []).length).toBe(1);
  });

  test("SaaS gates verify only master and the current closeout branch", () => {
    const workflow = read(".github/workflows/mvp-closeout.yml");
    expect(workflow).toContain("name: Link168 SaaS Full Gates");
    expect(workflow).toContain("master");
    expect(workflow).toContain("recovery/direct-goal-closeout-20260722");
    expect(workflow).not.toContain("integration/");
    expect(workflow).not.toContain("agent/p0-");
    expect(workflow).not.toContain("release/internal-test-20260630");
  });

  test("SaaS gates use Node 22 and PostgreSQL 16", () => {
    const workflow = read(".github/workflows/mvp-closeout.yml");
    expect(workflow).toContain("image: postgres:16");
    expect(workflow).toMatch(/node-version:\s*["']?22["']?/);
    expect(workflow).toContain("pg_isready");
  });

  test("SaaS gates run every hard gate in order", () => {
    const workflow = read(".github/workflows/mvp-closeout.yml");
    const commands = [
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

  test("profile publication schema has a deployable migration", () => {
    const schema = read("prisma/schema.prisma");
    const migration = read(
      "prisma/migrations/20260729_add_contact_entries_and_workspace_leads/migration.sql",
    );

    expect(schema).toContain(
      'isPublic                   Boolean          @default(false) @map("is_public")',
    );
    expect(schema).toContain('@map("first_published_at")');
    expect(migration).toContain('ALTER COLUMN "is_public" SET DEFAULT false');
    expect(migration).toContain(
      'ADD COLUMN "first_published_at" TIMESTAMPTZ(6)',
    );
  });

  test("personal publication readiness cannot borrow a team contact entry", () => {
    const profileRoute = read("src/app/api/dashboard/profile/route.ts");
    expect(profileRoute).toMatch(
      /links:\s*{\s*where:\s*{\s*isActive:\s*true,\s*workspaceId:\s*null\s*}/,
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
