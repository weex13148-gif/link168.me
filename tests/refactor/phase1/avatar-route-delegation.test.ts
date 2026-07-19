import { readFile } from "node:fs/promises";
import path from "node:path";

test("public avatar route delegates to the exact MediaAsset reader without filesystem discovery", async () => {
  const source = await readFile(
    path.join(process.cwd(), "src/app/api/avatar/[username]/route.ts"),
    "utf8",
  );

  expect(source).toContain('readAvatarAsset');
  expect(source).not.toContain('from "fs/promises"');
  expect(source).not.toContain("findAvatarFile");
  expect(source).not.toContain("getLegacyAvatarDirs");
});
