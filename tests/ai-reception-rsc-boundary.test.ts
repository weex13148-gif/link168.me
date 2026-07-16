import fs from "node:fs";
import path from "node:path";

test("AI reception server page serializes only the customer DTO", () => {
  const page = fs.readFileSync(
    path.join(process.cwd(), "src/app/workbench/ai/reception/page.tsx"),
    "utf8",
  );

  expect(page).toContain("toCustomerAiReceptionConfig");
  expect(page).toContain("initialConfig={toCustomerAiReceptionConfig(config)}");
  expect(page).not.toContain("initialConfig={config}");
});
