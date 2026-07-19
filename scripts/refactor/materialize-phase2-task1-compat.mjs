import fs from "node:fs";

function replaceExact(path, before, after) {
  let content = fs.readFileSync(path, "utf8");
  const first = content.indexOf(before);
  const last = content.lastIndexOf(before);
  if (first < 0) {
    if (content.includes(after)) return;
    throw new Error(`PHASE2_TASK1_COMPAT_MISSING path=${path} snippet=${before.slice(0, 100)}`);
  }
  if (first !== last) {
    throw new Error(`PHASE2_TASK1_COMPAT_AMBIGUOUS path=${path} snippet=${before.slice(0, 100)}`);
  }
  content = content.replace(before, after);
  fs.writeFileSync(path, content);
}

replaceExact(
  "src/lib/dashboard-data.ts",
  "  sortOrder: number;\n  isActive: boolean;\n  allowAiRecommendation: boolean;\n",
  "  sortOrder: number;\n  status: string;\n  allowAiRecommendation: boolean;\n",
);
replaceExact(
  "src/lib/dashboard-data.ts",
  "    is_active: product.isActive,\n",
  '    is_active: product.status === "published",\n',
);

replaceExact(
  "src/app/api/dashboard/products/route.ts",
  '    where: { userId: user.id, ...(activeOnly ? { isActive: true } : {}) },\n',
  '    where: { userId: user.id, ...(activeOnly ? { status: "published" } : {}) },\n',
);
replaceExact(
  "src/app/api/dashboard/products/route.ts",
  "  const isActive = sanitizeBool(body.isActive, true);\n",
  '  const status = sanitizeBool(body.isActive, true) ? "published" : "archived";\n',
);
replaceExact(
  "src/app/api/dashboard/products/route.ts",
  "      isActive,\n",
  "      status,\n",
);

replaceExact(
  "src/app/api/dashboard/products/[id]/route.ts",
  "  const isActive = sanitizeBool(body.isActive, existing.isActive);\n",
  '  const status = sanitizeBool(body.isActive, existing.status === "published")\n    ? "published"\n    : "archived";\n',
);
replaceExact(
  "src/app/api/dashboard/products/[id]/route.ts",
  "      isActive,\n",
  "      status,\n",
);

replaceExact(
  "src/app/console/page.tsx",
  'p.priceText || (p.isActive ? "在售" : "草稿")',
  'p.priceText || (p.status === "published" ? "在售" : "草稿")',
);

replaceExact(
  "src/app/workbench/products/page.tsx",
  "  const activeCount = products.filter((p) => p.isActive).length;\n",
  '  const activeCount = products.filter((p) => p.status === "published").length;\n',
);
replaceExact(
  "src/app/workbench/products/page.tsx",
  "  const inactiveCount = products.filter((p) => !p.isActive).length;\n",
  '  const inactiveCount = products.filter((p) => p.status !== "published").length;\n',
);

replaceExact(
  "src/components/workbench/ProductsClient.tsx",
  "      isActive: product.isActive,\n",
  '      isActive: product.status === "published",\n',
);
replaceExact(
  "src/components/workbench/ProductsClient.tsx",
  `              ? {
                  ...p,
                  ...data.product,
                  createdAt: new Date(data.product.created_at),
                  updatedAt: new Date(),
                }
`,
  `              ? {
                  ...p,
                  ...data.product,
                  status: data.product.is_active ? "published" : "archived",
                  createdAt: new Date(data.product.created_at),
                  updatedAt: new Date(),
                }
`,
);
replaceExact(
  "src/components/workbench/ProductsClient.tsx",
  "            isActive: data.product.is_active,\n",
  '            status: data.product.is_active ? "published" : "archived",\n',
);
replaceExact(
  "src/components/workbench/ProductsClient.tsx",
  `              ? {
                  ...p,
                  isActive: data.product.is_active,
                  updatedAt: new Date(),
                }
`,
  `              ? {
                  ...p,
                  status: data.product.is_active ? "published" : "archived",
                  updatedAt: new Date(),
                }
`,
);
replaceExact(
  "src/components/workbench/ProductsClient.tsx",
  'product.isActive ? "bg-[#DDE8CD] text-[#3F5F31]" : "bg-[#F7F1E7] text-[#7A6D5E]"',
  'product.status === "published" ? "bg-[#DDE8CD] text-[#3F5F31]" : "bg-[#F7F1E7] text-[#7A6D5E]"',
);
replaceExact(
  "src/components/workbench/ProductsClient.tsx",
  '{product.isActive ? "在售" : "已下架"}',
  '{product.status === "published" ? "在售" : "已下架"}',
);
replaceExact(
  "src/components/workbench/ProductsClient.tsx",
  "onClick={() => handleToggleActive(product.id, product.isActive)}",
  'onClick={() => handleToggleActive(product.id, product.status === "published")}',
);
replaceExact(
  "src/components/workbench/ProductsClient.tsx",
  'title={product.isActive ? "下架" : "上架"}',
  'title={product.status === "published" ? "下架" : "上架"}',
);
replaceExact(
  "src/components/workbench/ProductsClient.tsx",
  '{product.isActive ? <X aria-hidden className="size-3" /> : <Check aria-hidden className="size-3" />}',
  '{product.status === "published" ? <X aria-hidden className="size-3" /> : <Check aria-hidden className="size-3" />}',
);

console.log("PHASE2_TASK1_COMPAT_MATERIALIZED");
