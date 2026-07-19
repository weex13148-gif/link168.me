import fs from "node:fs";

function replaceExact(path, before, after) {
  let content = fs.readFileSync(path, "utf8");
  if (content.includes(after)) return;
  const first = content.indexOf(before);
  const last = content.lastIndexOf(before);
  if (first < 0 || first !== last) {
    throw new Error(`PRODUCT_STATUS_CUTOVER_MATCH path=${path} count=${first < 0 ? 0 : 2}`);
  }
  content = content.replace(before, after);
  fs.writeFileSync(path, content);
}

replaceExact(
  "src/app/%5F_w/[workspaceId]/p/[slug]/page.tsx",
  "where: { userId: profile.userId, isActive: true }",
  'where: { userId: profile.userId, status: "published" }',
);
replaceExact(
  "src/app/%5F_w/[workspaceId]/page.tsx",
  "where: { userId: workspace.ownerId, isActive: true }",
  'where: { userId: workspace.ownerId, status: "published" }',
);
replaceExact(
  "src/app/%5F_w/[workspaceId]/products/page.tsx",
  "where: { userId: workspace.ownerId, isActive: true }",
  'where: { userId: workspace.ownerId, status: "published" }',
);
replaceExact(
  "src/app/api/[username]/products/route.ts",
  `        userId: profile.userId,
        isActive: true,
`,
  `        userId: profile.userId,
        status: "published",
`,
);
replaceExact(
  "src/app/api/contact/route.ts",
  `        id: interestedProductId,
        userId: profile.userId,
        isActive: true,
`,
  `        id: interestedProductId,
        userId: profile.userId,
        status: "published",
`,
);
replaceExact(
  "src/app/workbench/ai/reception/page.tsx",
  "db.product.count({ where: { userId: user.id, isActive: true } })",
  'db.product.count({ where: { userId: user.id, status: "published" } })',
);
replaceExact(
  "src/lib/billing/entitlements/index.ts",
  "db.product.count({ where: { userId, isActive: true } })",
  'db.product.count({ where: { userId, status: "published" } })',
);
replaceExact(
  "tests/product-binding-order.test.ts",
  "where: { id: productA, userId, isActive: true }",
  'where: { id: productA, userId, status: "published" }',
);

console.log("PHASE2_TASK1_REMAINING_STATUS_MATERIALIZED");
