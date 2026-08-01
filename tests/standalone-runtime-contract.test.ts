import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function source(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("standalone runtime asset contract", () => {
  test("packages static and public assets after every build", () => {
    const packageJson = JSON.parse(source("package.json")) as { scripts: Record<string, string> };
    const prepareScript = source("scripts/release/prepare-standalone.js");

    expect(packageJson.scripts.postbuild).toBe("node scripts/release/prepare-standalone.js");
    expect(prepareScript).toContain('path.join(root, ".next", "static")');
    expect(prepareScript).toContain('path.join(root, "public")');
    expect(prepareScript).toContain("fs.cpSync");
  });

  test("smoke verifies the packaged artifact without mutating it", () => {
    const smoke = source("scripts/release/smoke-standalone.js");

    expect(smoke).toContain("requireRuntimeDirectory");
    expect(smoke).toContain('path.join(standaloneDir, ".next", "static")');
    expect(smoke).toContain('const response = await request("/")');
    expect(smoke).not.toContain("fs.cpSync");
    expect(smoke).toContain("RELEASE_SMOKE_REQUIRE_DB");
    expect(smoke).toContain('request("/api/health")');
  });
});
