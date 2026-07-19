import { spawnSync } from "node:child_process";
import fs from "node:fs";

const reportPath =
  "docs/superpowers/reports/2026-07-19-schema-baseline.json";

describe("Phase 0 Prisma schema fingerprint", () => {
  it("matches the committed schema baseline", () => {
    const result = spawnSync(
      process.execPath,
      ["scripts/refactor/schema-fingerprint.mjs", "--check"],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("SCHEMA_FINGERPRINT_OK");
  });

  it("stores the exact deterministic report shape", () => {
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8")) as {
      algorithm?: unknown;
      digest?: unknown;
      fileCount?: unknown;
      files?: unknown;
      [key: string]: unknown;
    };

    expect(Object.keys(report).sort()).toEqual([
      "algorithm",
      "digest",
      "fileCount",
      "files",
    ]);
    expect(report.algorithm).toBe("sha256");
    expect(report.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(Number.isInteger(report.fileCount)).toBe(true);
    expect(Array.isArray(report.files)).toBe(true);
    expect(report.fileCount).toBe((report.files as unknown[]).length);
    expect(report.files).toEqual(
      [...(report.files as string[])].sort((left, right) =>
        left.localeCompare(right),
      ),
    );
    for (const file of report.files as string[]) {
      expect(file.startsWith("prisma/")).toBe(true);
      expect(file.endsWith(".prisma") || file.endsWith(".sql")).toBe(true);
    }
  });
});
