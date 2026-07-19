import fs from "node:fs";

describe("Phase 0 approved baseline", () => {
  it("locks the approved baseline and checks ancestry and status", () => {
    const source = fs.readFileSync("scripts/refactor/verify-baseline.mjs", "utf8");

    expect(source).toContain("5e8831b12e7528a4956ecae6953ad694609c3a20");
    expect(source).toContain("merge-base");
    expect(source).toContain("status");
  });
});
