import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireWorkspacePublicRequestHost } from "@/lib/workspace-public-request";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ workspaceId: string }>;
};

async function loadWorkspace(workspaceId: string) {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      planCode: true,
      ownerId: true,
      isActive: true,
    },
  });
  if (!workspace || !workspace.isActive) return null;
  return workspace;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspaceId } = await params;
  await requireWorkspacePublicRequestHost(workspaceId);
  const workspace = await loadWorkspace(workspaceId);
  if (!workspace) notFound();
  return {
    title: `${workspace.name} | 企业官网`,
    description: workspace.description || `${workspace.name} 的企业官网`,
  };
}

export default async function EnterpriseHomePage({ params }: Props) {
  const { workspaceId } = await params;
  await requireWorkspacePublicRequestHost(workspaceId);
  const workspace = await loadWorkspace(workspaceId);
  if (!workspace) notFound();

  // 读取企业主（owner）的 Profile 作为联系方式回退
  const ownerProfile = await db.profile
    .findUnique({
      where: { userId: workspace.ownerId },
      select: {
        phone: true,
        email: true,
        wechat: true,
        city: true,
        address: true,
        website: true,
        contactVisibility: true,
        company: true,
      },
    })
    .catch(() => null);

  // 统计活跃员工公开名片数量
  const activeProfileCount = await db.workspacePublicProfile.count({
    where: { workspaceId, status: "active" },
  });

  // 读取企业产品（来自 owner 的 products）
  const productCount = await db.product.count({
    where: { userId: workspace.ownerId, status: "published" },
  });

  const contactIsPublic = ownerProfile?.contactVisibility === "public";
  const phone = contactIsPublic ? ownerProfile?.phone : null;
  const email = contactIsPublic ? ownerProfile?.email : null;
  const wechat = contactIsPublic ? ownerProfile?.wechat : null;
  const city = contactIsPublic ? ownerProfile?.city : null;
  const address = contactIsPublic ? ownerProfile?.address : null;
  const website = contactIsPublic ? ownerProfile?.website : null;

  const hasContact = Boolean(phone || email || wechat || city || address || website);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-8 sm:py-12">
      {/* 企业名称 + 简介 */}
      <header className="border-b border-gray-200 pb-8">
        <div className="flex items-center gap-4">
          {/* Logo：当前 schema 无 logo 字段，使用首字母占位 */}
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full bg-[#6F8F4E] text-2xl font-black text-white"
            aria-hidden="true"
          >
            {workspace.name.slice(0, 1)}
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 sm:text-3xl">{workspace.name}</h1>
            <p className="mt-1 text-sm text-gray-500">企业官网</p>
          </div>
        </div>
        {workspace.description ? (
          <p className="mt-4 text-base leading-relaxed text-gray-700">{workspace.description}</p>
        ) : (
          <p className="mt-4 text-sm text-gray-400">该企业尚未填写简介</p>
        )}
      </header>

      {/* 快捷入口 */}
      <nav className="grid grid-cols-2 gap-3 py-8 sm:grid-cols-3">
        <Link
          href="/products"
          className="rounded-xl border border-gray-200 p-4 transition hover:border-[#6F8F4E] hover:bg-[#6F8F4E]/5"
        >
          <div className="text-sm font-bold text-gray-900">产品与服务</div>
          <div className="mt-1 text-xs text-gray-500">
            {productCount > 0 ? `${productCount} 项` : "暂无产品"}
          </div>
        </Link>
        <Link
          href="/employees"
          className="rounded-xl border border-gray-200 p-4 transition hover:border-[#6F8F4E] hover:bg-[#6F8F4E]/5"
        >
          <div className="text-sm font-bold text-gray-900">员工名片</div>
          <div className="mt-1 text-xs text-gray-500">
            {activeProfileCount > 0 ? `${activeProfileCount} 位员工` : "暂无员工名片"}
          </div>
        </Link>
        <Link
          href="/contact"
          className="rounded-xl border border-gray-200 p-4 transition hover:border-[#6F8F4E] hover:bg-[#6F8F4E]/5"
        >
          <div className="text-sm font-bold text-gray-900">联系我们</div>
          <div className="mt-1 text-xs text-gray-500">
            {hasContact ? "查看联系方式" : "暂未提供"}
          </div>
        </Link>
        <Link
          href="/about"
          className="rounded-xl border border-gray-200 p-4 transition hover:border-[#6F8F4E] hover:bg-[#6F8F4E]/5"
        >
          <div className="text-sm font-bold text-gray-900">关于我们</div>
          <div className="mt-1 text-xs text-gray-500">企业介绍</div>
        </Link>
        <Link
          href="/ai"
          className="rounded-xl border border-gray-200 p-4 transition hover:border-[#6F8F4E] hover:bg-[#6F8F4E]/5"
        >
          <div className="text-sm font-bold text-gray-900">AI 客服</div>
          <div className="mt-1 text-xs text-gray-500">在线咨询</div>
        </Link>
      </nav>

      {/* 联系方式概要 */}
      {hasContact ? (
        <section className="border-t border-gray-200 py-8">
          <h2 className="mb-4 text-lg font-bold text-gray-900">联系方式</h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {phone ? (
              <div>
                <dt className="text-xs text-gray-500">电话</dt>
                <dd className="text-sm font-medium text-gray-900">{phone}</dd>
              </div>
            ) : null}
            {email ? (
              <div>
                <dt className="text-xs text-gray-500">邮箱</dt>
                <dd className="text-sm font-medium text-gray-900">{email}</dd>
              </div>
            ) : null}
            {wechat ? (
              <div>
                <dt className="text-xs text-gray-500">微信</dt>
                <dd className="text-sm font-medium text-gray-900">{wechat}</dd>
              </div>
            ) : null}
            {city || address ? (
              <div>
                <dt className="text-xs text-gray-500">地址</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {[city, address].filter(Boolean).join(" · ")}
                </dd>
              </div>
            ) : null}
            {website ? (
              <div>
                <dt className="text-xs text-gray-500">网站</dt>
                <dd className="text-sm font-medium text-gray-900 break-all">{website}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      <footer className="mt-auto border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
        由 Link168 提供企业官网能力
      </footer>
    </main>
  );
}
