import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function createFixture(source: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "link168-domain-boundary-"));
  fs.writeFileSync(path.join(root, "fixture.ts"), source, "utf8");
  return root;
}

function runBoundaryCheck(root: string) {
  return spawnSync(
    process.execPath,
    ["scripts/refactor/check-domain-boundaries.mjs", `--root=${root}`],
    { encoding: "utf8" },
  );
}

describe("Phase 0 domain dependency boundaries", () => {
  it("allows a domain to depend on shared contracts", () => {
    const root = createFixture('import { ok } from "@/shared/result";\nvoid ok(true);\n');
    const result = runBoundaryCheck(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("DOMAIN_BOUNDARIES_OK");
  });

  it.each([
    ["app", 'import page from "@/app/page";\nvoid page;\n'],
    ["components", 'import Button from "@/components/Button";\nvoid Button;\n'],
    ["infrastructure", 'import db from "@/infrastructure/database";\nvoid db;\n'],
  ])("rejects domain imports from %s", (_label, source) => {
    const root = createFixture(source);
    const result = runBoundaryCheck(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("DOMAIN_BOUNDARY_VIOLATION");
  });
});
