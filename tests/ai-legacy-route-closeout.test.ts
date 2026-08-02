import fs from "node:fs";
import path from "node:path";
import { resolveLegacyConsoleRoute } from "@/lib/legacy-console-routes";

const root = process.cwd();

function source(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("AI legacy route closeout", () => {
  test("legacy workbench pages only redirect to canonical console pages", () => {
    expect(source("src/app/workbench/ai-service/page.tsx")).toContain(
      'redirect("/console/ai-reception")',
    );
    expect(source("src/app/workbench/ai/page.tsx")).toContain(
      'redirect("/console/ai")',
    );
    expect(source("src/app/workbench/ai/reception/page.tsx")).toContain(
      'redirect("/console/ai-reception")',
    );
    expect(source("src/app/workbench/ai/[assistant]/page.tsx")).toContain(
      "redirect(`/console/ai/${encodeURIComponent(assistant)}`)",
    );
  });

  test("console pages own the AI implementations without re-exporting workbench", () => {
    const listPage = source("src/app/console/ai/page.tsx");
    const assistantPage = source("src/app/console/ai/[assistant]/page.tsx");
    const receptionPage = source("src/app/console/ai-reception/page.tsx");

    expect(listPage).toContain("ConsoleAiPage");
    expect(assistantPage).toContain("ConsoleAiAssistantPage");
    expect(receptionPage).toContain("ConsoleAiReceptionPage");
    expect(`${listPage}\n${assistantPage}\n${receptionPage}`).not.toContain(
      "@/app/workbench/ai",
    );
  });

  test("legacy resolver preserves assistant slugs and avoids reception loops", () => {
    expect(resolveLegacyConsoleRoute("/workbench/ai-service")).toBe(
      "/console/ai-reception",
    );
    expect(resolveLegacyConsoleRoute("/workbench/ai")).toBe("/console/ai");
    expect(resolveLegacyConsoleRoute("/workbench/ai/reception")).toBe(
      "/console/ai-reception",
    );
    expect(resolveLegacyConsoleRoute("/workbench/ai/social-media")).toBe(
      "/console/ai/social-media",
    );
  });

  test("legacy AI config is a direct alias of the canonical route", () => {
    const legacyApi = source("src/app/api/workbench/ai-config/route.ts");
    expect(legacyApi).toContain("@/app/api/dashboard/ai-service-config/route");
    expect(legacyApi).not.toContain("@/lib/db");
    expect(legacyApi).not.toContain("provider_mode");
  });

  test("hidden admin AI freeze route is removed in favor of Jeepwork restrictions", () => {
    expect(
      fs.existsSync(path.join(root, "src/app/api/admin/ai/freeze/route.ts")),
    ).toBe(false);

    const restrictions = source(
      "src/app/api/jeepwork/users/[id]/restrictions/route.ts",
    );
    const permissions = source("src/lib/ai/permissions.ts");
    expect(restrictions).toContain("RESTRICTION_TYPE_ADMIN_FREEZE");
    expect(permissions).toContain('"ADMIN_FREEZE"');
  });
});
