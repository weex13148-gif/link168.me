import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

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
    return { title: "联系我们 | Link168" };
  }
  return { title: `联系我们 | ${workspace.name}` };
}

export default async function EnterpriseContactPage({ params }: Props) {
  const { workspaceId } = await params;
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true, ownerId: true, isActive: true },
  });
  if (!workspace || !workspace.isActive) notFound();

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
      <header className="border-b border-gray-200 pb-6">
        <Link href="/" className="text-xs text-gray-500 hover:text-[#6F8F4E]">
          ← 返回首页
        </Link>
        <h1 className="mt-3 text-2xl font-black text-gray-900">联系我们</h1>
        <p className="mt-1 text-sm text-gray-500">{workspace.name}</p>
      </header>

      {!hasContact ? (
        <div className="flex flex-1 items-center justify-center py-16 text-center">
          <p className="text-sm text-gray-400">该企业暂未提供公开联系方式</p>
        </div>
      ) : (
        <dl className="grid grid-cols-1 gap-4 py-8 sm:grid-cols-2">
          {phone ? (
            <div className="rounded-xl border border-gray-200 p-4">
              <dt className="text-xs text-gray-500">电话</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">{phone}</dd>
            </div>
          ) : null}
          {email ? (
            <div className="rounded-xl border border-gray-200 p-4">
              <dt className="text-xs text-gray-500">邮箱</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900 break-all">{email}</dd>
            </div>
          ) : null}
          {wechat ? (
            <div className="rounded-xl border border-gray-200 p-4">
              <dt className="text-xs text-gray-500">微信</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">{wechat}</dd>
            </div>
          ) : null}
          {city || address ? (
            <div className="rounded-xl border border-gray-200 p-4">
              <dt className="text-xs text-gray-500">地址</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">
                {[city, address].filter(Boolean).join(" · ")}
              </dd>
            </div>
          ) : null}
          {website ? (
            <div className="rounded-xl border border-gray-200 p-4">
              <dt className="text-xs text-gray-500">网站</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900 break-all">
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#6F8F4E] hover:underline"
                >
                  {website}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      )}
    </main>
  );
}
