import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { sanitizePublicUrl } from "@/lib/public-url-security";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ workspaceId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspaceId } = await params;
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true, isActive: true },
  });
  if (!workspace || !workspace.isActive) {
    return { title: "产品与服务 | Link168" };
  }
  return { title: `产品与服务 | ${workspace.name}` };
}

export default async function EnterpriseProductsPage({ params }: Props) {
  const { workspaceId } = await params;
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true, ownerId: true, isActive: true },
  });
  if (!workspace || !workspace.isActive) notFound();

  const rawProducts = await db.product.findMany({
    where: { userId: workspace.ownerId, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      priceText: true,
      coverImageUrl: true,
      ctaLabel: true,
      ctaUrl: true,
    },
  });

  const products = rawProducts.map((product) => {
    const checked = product.ctaUrl ? sanitizePublicUrl(product.ctaUrl) : null;
    return {
      ...product,
      ctaUrl: checked?.safe ? checked.url : null,
    };
  });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-8 sm:py-12">
      <header className="border-b border-gray-200 pb-6">
        <Link href="/" className="text-xs text-gray-500 hover:text-[#6F8F4E]">
          ← 返回首页
        </Link>
        <h1 className="mt-3 text-2xl font-black text-gray-900">产品与服务</h1>
        <p className="mt-1 text-sm text-gray-500">{workspace.name}</p>
      </header>

      {products.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-16 text-center">
          <div>
            <p className="text-sm text-gray-400">该企业暂未发布产品</p>
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 py-6 sm:grid-cols-2">
          {products.map((product) => (
            <li
              key={product.id}
              className="rounded-xl border border-gray-200 p-4 transition hover:border-[#6F8F4E]"
            >
              {product.coverImageUrl ? (
                <img
                  src={product.coverImageUrl}
                  alt={product.name}
                  className="mb-3 h-32 w-full rounded-lg object-cover"
                />
              ) : null}
              <div className="text-xs text-gray-500">{product.category || "未分类"}</div>
              <h2 className="mt-1 text-base font-bold text-gray-900">{product.name}</h2>
              {product.description ? (
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">{product.description}</p>
              ) : null}
              {product.priceText ? (
                <p className="mt-2 text-sm font-bold text-[#6F8F4E]">{product.priceText}</p>
              ) : null}
              {product.ctaUrl ? (
                <a
                  href={product.ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex min-h-9 items-center justify-center rounded-full bg-[#6F8F4E] px-4 text-xs font-bold text-white"
                >
                  {product.ctaLabel || "了解详情"}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
