import { execFileSync } from "node:child_process";
import fs from "node:fs";

const read = (file: string) => fs.readFileSync(file, "utf8");

const floatingTags = new Set(["latest", "*", "next"]);

describe("Phase 0 runtime and dependency policy", () => {
  it("uses Node 22 for local and package runtime declarations", () => {
    expect(read(".nvmrc").trim()).toBe("22");
    expect(read(".node-version").trim()).toBe("22");

    const pkg = JSON.parse(read("package.json")) as {
      engines?: { node?: string };
    };
    expect(pkg.engines).toEqual({ node: ">=22 <23" });
  });

  it("contains no forbidden floating direct dependency declarations", () => {
    const pkg = JSON.parse(read("package.json")) as Record<string, unknown>;

    for (const section of ["dependencies", "devDependencies", "optionalDependencies"] as const) {
      const declarations = (pkg[section] ?? {}) as Record<string, string>;
      for (const [name, version] of Object.entries(declarations)) {
        expect(name).not.toBe("");
        expect(version).not.toBe("");
        expect(floatingTags.has(version)).toBe(false);
      }
    }
  });

  it("exposes and executes the deterministic dependency policy check", () => {
    const pkg = JSON.parse(read("package.json")) as {
      scripts?: Record<string, string>;
    };
    expect(pkg.scripts?.["check:dependencies"]).toBe(
      "node scripts/refactor/pin-direct-dependencies.mjs --check",
    );

    const output = execFileSync(
      process.execPath,
      ["scripts/refactor/pin-direct-dependencies.mjs", "--check"],
      { encoding: "utf8" },
    );
    expect(output.trim()).toBe("DEPENDENCY_POLICY_OK");
  });
});

describe("Phase 0 refactor CI gate", () => {
  const workflow = read(".github/workflows/mvp-closeout.yml");

  it("covers only master and the unique refactor mainline", () => {
    expect(workflow).toContain("name: Link168 Refactor Gate");
    expect(workflow).toContain("- master");
    expect(workflow).toContain("- refactor/link168-modular-monolith-r1");
    expect(workflow).not.toContain("integration/mvp-closeout-r1");
  });

  it("uses the required runtime and services without soft failures", () => {
    expect(workflow).toContain("image: postgres:16");
    expect(workflow).toContain("image: redis:7-alpine");
    expect(workflow).toContain("node-version: 22");
    expect(workflow).toContain("fetch-depth: 0");
    expect(workflow).not.toContain("continue-on-error");
  });

  it("runs the approved verification commands in order", () => {
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

    let previousIndex = -1;
    for (const command of commands) {
      const index = workflow.indexOf(command);
      expect(index).toBeGreaterThan(previousIndex);
      previousIndex = index;
    }
  });
});
