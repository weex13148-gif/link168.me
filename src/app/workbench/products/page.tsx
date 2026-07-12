import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkspaceOwnedResourceIds } from "@/lib/workspace/resources";
import WorkbenchShell from "@/components/workbench/WorkbenchShell";
import ProductsClient from "@/components/workbench/ProductsClient";

export default async function WorkbenchProductsPage() {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect("/login");

  const enterpriseProductIds = await getWorkspaceOwnedResourceIds("product");
  const [products, profile] = await Promise.all([
    db.product.findMany({
      where: {
        userId: user.id,
        ...(enterpriseProductIds.length > 0 ? { id: { notIn: enterpriseProductIds } } : {}),
      },
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    db.profile.findUnique({ where: { userId: user.id } }),
  ]);

  if (!profile) redirect("/dashboard");

  const activeCount = products.filter((product) => product.isActive).length;
  const inactiveCount = products.filter((product) => !product.isActive).length;

  return (
    <WorkbenchShell
      eyebrow="Products & Services"
      title="产品与服务"
      subtitle="这里仅管理个人产品；企业产品请从对应企业工作空间进入。"
    >
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "在售产品", value: activeCount, tone: "bg-[var(--ui-brand-soft)] text-[var(--ui-brand)]" },
          { label: "草稿产品", value: 0, tone: "bg-[#EAF3FF] text-[#2563EB]" },
          { label: "已下架", value: inactiveCount, tone: "bg-[var(--ui-page)] text-[var(--ui-muted)]" },
        ].map((item) => (
          <div key={item.label} className="rounded-[28px] border border-[var(--ui-line)] bg-[var(--ui-surface-strong)] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[var(--ui-muted)]">{item.label}</p>
              <span className={`grid size-8 place-items-center rounded-xl ${item.tone}`}>
                <Package aria-hidden className="size-4" />
              </span>
            </div>
            <p className="mt-2 text-3xl font-black tracking-tight text-[var(--ui-ink)]">{item.value}</p>
          </div>
        ))}
      </section>
      <ProductsClient initialProducts={products} />
    </WorkbenchShell>
  );
}
