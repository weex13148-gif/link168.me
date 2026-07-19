import { execFileSync } from "node:child_process";
import fs from "node:fs";

describe("Phase 0 approved baseline", () => {
  it("locks the approved baseline and checks ancestry and status", () => {
    const source = fs.readFileSync("scripts/refactor/verify-baseline.mjs", "utf8");

    expect(source).toContain("5e8831b12e7528a4956ecae6953ad694609c3a20");
    expect(source).toContain("merge-base");
    expect(source).toContain("status");
  });

  it("executes successfully when the approved baseline is an ancestor", () => {
    const output = execFileSync(process.execPath, ["scripts/refactor/verify-baseline.mjs"], {
      encoding: "utf8",
      env: {
        ...process.env,
        ALLOW_DIRTY_WORKTREE: "true",
      },
    });
    const result = JSON.parse(output) as {
      baseline: string;
      head: string;
      clean: boolean;
    };

    expect(result.baseline).toBe("5e8831b12e7528a4956ecae6953ad694609c3a20");
    expect(result.head).toMatch(/^[0-9a-f]{40}$/);
    expect(typeof result.clean).toBe("boolean");
  });
});
