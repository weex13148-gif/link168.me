import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { WORKSPACE_RESERVED_SLUGS } from "@/lib/domains";

const root = process.cwd();
const retiredPaths = [
  "src/app/showcase",
  "src/app/api/showcase",
  "src/app/jeepwork/showcase",
  "src/app/jeepwork/competition-center",
  "src/app/jeepwork/competition-ai-debug",
  "src/app/api/jeepwork/showcase",
  "src/app/api/jeepwork/competition-center",
  "src/app/api/jeepwork/competition-ai-debug",
  "src/app/api/jeepwork/competition-files",
  "src/components/showcase",
  "src/lib/showcase.ts",
  "src/lib/showcase-config.ts",
  "src/lib/showcase-v2.ts",
  "src/lib/showcase-v2-shared.ts",
];

describe("showcase retirement", () => {
  test.each(retiredPaths)("%s is absent", (relativePath) => {
    expect(existsSync(path.join(root, relativePath))).toBe(false);
  });

  test("active discovery surfaces do not publish the retired route", () => {
    const active = [
      "src/app/sitemap.ts",
      "src/app/robots.ts",
      "src/app/jeepwork/page.tsx",
      "src/lib/jeepwork-navigation.ts",
      "src/lib/admin-governance/permissions.ts",
    ]
      .map((file) => readFileSync(path.join(root, file), "utf8"))
      .join("\n");
    expect(active).not.toMatch(/\/showcase|competition-center|competition-ai-debug/);
  });

  test("the retired public slug remains reserved", () => {
    expect(WORKSPACE_RESERVED_SLUGS.has("showcase")).toBe(true);
  });

  test("the dynamic username route rejects showcase before profile resolution", () => {
    const dynamicRoute = readFileSync(path.join(root, "src/app/[username]/page.tsx"), "utf8");
    const guardedEntries = dynamicRoute.match(
      /const \{ username \} = await params;\s+if \(normalizeUsername\(username\) === "showcase"\) notFound\(\);\s+(?:const query = searchParams \? await searchParams : \{\};\s+)?const result = await resolveUsername\(username\);/g,
    );

    expect(guardedEntries).toHaveLength(2);
  });
});
