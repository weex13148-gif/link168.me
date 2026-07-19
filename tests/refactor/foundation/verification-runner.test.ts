import fs from "node:fs";

const runnerPath = "scripts/refactor/run-phase0-verification.mjs";
const workflowPath = ".github/workflows/mvp-closeout.yml";

const commands = [
  "npm ci",
  "node scripts/refactor/verify-baseline.mjs",
  "npm run check:dependencies",
  "npm run check:boundaries",
  "node scripts/refactor/schema-fingerprint.mjs --check",
  "npx prisma validate",
  "npx prisma generate",
  "npx prisma migrate deploy",
  "npm run typecheck",
  "npm run lint",
  "npm test -- --runInBand",
  "npm run build",
  "git diff --check",
];

describe("Phase 0 reproducible verification runner", () => {
  it("contains every hard gate in the approved order", () => {
    const source = fs.readFileSync(runnerPath, "utf8");
    let previousIndex = -1;

    for (const command of commands) {
      const index = source.indexOf(`\"${command}\"`);
      expect(index).toBeGreaterThan(previousIndex);
      previousIndex = index;
    }
    expect(source).toContain("READY_FOR_NEXT_PHASE");
    expect(source).toContain("BLOCKED");
    expect(source).toContain("2026-07-19-phase-0-verification.json");
  });

  it("exposes verify:phase0 and adds boundary and schema checks to CI", () => {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
      scripts?: Record<string, string>;
    };
    expect(pkg.scripts?.["verify:phase0"]).toBe(
      "node scripts/refactor/run-phase0-verification.mjs",
    );

    const workflow = fs.readFileSync(workflowPath, "utf8");
    const boundaryIndex = workflow.indexOf("npm run check:boundaries");
    const schemaIndex = workflow.indexOf(
      "node scripts/refactor/schema-fingerprint.mjs --check",
    );
    const prismaIndex = workflow.indexOf("npx prisma validate");

    expect(boundaryIndex).toBeGreaterThan(-1);
    expect(schemaIndex).toBeGreaterThan(boundaryIndex);
    expect(prismaIndex).toBeGreaterThan(schemaIndex);
  });
});
