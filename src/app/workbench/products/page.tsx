/**
 * Workbench Products 页面（服务端数据获取）
 * 新增、编辑、删除产品
 */
import { redirect } from "next/navigation";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { db } from "@/lib/db";
import WorkbenchShell from "@/components/workbench/WorkbenchShell";
import ProductsClient from "@/components/workbench/ProductsClient";
import { Package } from "lucide-react";

export default async function WorkbenchProductsPage() {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect("/login");

  const [products, profile] = await Promise.all([
    db.product.findMany({
      where: { userId: user.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    db.profile.findUnique({ where: { userId: user.id } }),
  ]);

  if (!profile) redirect("/dashboard");

  const activeCount = products.filter((p) => p.status === "published").length;
  const draftCount = 0; // 草稿概念暂不实现
  const inactiveCount = products.filter((p) => p.status !== "published").length;

  return (
    <WorkbenchShell
      eyebrow="Products & Services"
      title="产品与服务"
      subtitle="录入产品或服务资料，AI 客服会根据产品信息自动回答客户咨询。"
    >
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "在售产品", value: activeCount, tone: "bg-[#DDE8CD] text-[#3F5F31]" },
          { label: "草稿产品", value: draftCount, tone: "bg-[#EAF3FF] text-[#2563EB]" },
          { label: "已下架", value: inactiveCount, tone: "bg-[#F7F1E7] text-[#7A6D5E]" },
        ].map((item) => (
          <div key={item.label} className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#7A6D5E]">{item.label}</p>
              <span className={`grid size-8 place-items-center rounded-xl ${item.tone}`}>
                <Package aria-hidden className="size-4" />
              </span>
            </div>
            <p className="mt-2 text-3xl font-black tracking-tight text-[#2B241E]">{item.value}</p>
          </div>
        ))}
      </section>

      <ProductsClient initialProducts={products} />
    </WorkbenchShell>
  );
}
