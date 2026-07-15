import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireWorkspacePublicRequestHost } from "@/lib/workspace-public-request";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ workspaceId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspaceId } = await params;
  await requireWorkspacePublicRequestHost(workspaceId);
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true, isActive: true },
  });
  if (!workspace || !workspace.isActive) {
    return { title: "关于我们 | Link168" };
  }
  return { title: `关于我们 | ${workspace.name}` };
}

export default async function EnterpriseAboutPage({ params }: Props) {
  const { workspaceId } = await params;
  await requireWorkspacePublicRequestHost(workspaceId);
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true, description: true, createdAt: true, isActive: true },
  });
  if (!workspace || !workspace.isActive) notFound();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-8 sm:py-12">
      <header className="border-b border-gray-200 pb-6">
        <Link href="/" className="text-xs text-gray-500 hover:text-[#6F8F4E]">
          ← 返回首页
        </Link>
        <h1 className="mt-3 text-2xl font-black text-gray-900">关于我们</h1>
        <p className="mt-1 text-sm text-gray-500">{workspace.name}</p>
      </header>

      <section className="py-8">
        {workspace.description ? (
          <p className="text-base leading-relaxed text-gray-700">{workspace.description}</p>
        ) : (
          <p className="text-sm text-gray-400">该企业尚未填写介绍</p>
        )}
      </section>

      <section className="border-t border-gray-200 py-6 text-sm text-gray-500">
        <p>成立于 {new Date(workspace.createdAt).toLocaleDateString("zh-CN")}</p>
      </section>
    </main>
  );
}
