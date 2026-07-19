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

  it("contains no floating direct dependency declarations", () => {
    const pkg = JSON.parse(read("package.json")) as Record<string, unknown>;

    for (const section of ["dependencies", "devDependencies", "optionalDependencies"] as const) {
      const declarations = (pkg[section] ?? {}) as Record<string, string>;
      for (const [name, version] of Object.entries(declarations)) {
        expect(floatingTags.has(version)).toBe(false);
        expect(version).toMatch(/^\d+\.\d+\.\d+(?:[-+].+)?$/);
        expect(name).not.toBe("");
      }
    }
  });

  it("exposes a deterministic dependency policy check command", () => {
    const pkg = JSON.parse(read("package.json")) as {
      scripts?: Record<string, string>;
    };
    expect(pkg.scripts?.["check:dependencies"]).toBe(
      "node scripts/refactor/pin-direct-dependencies.mjs --check",
    );
  });
});
