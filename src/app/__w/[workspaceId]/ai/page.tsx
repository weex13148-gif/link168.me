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
    return { title: "AI 客服 | Link168" };
  }
  return { title: `AI 客服 | ${workspace.name}` };
}

export default async function EnterpriseAiPage({ params }: Props) {
  const { workspaceId } = await params;
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true, ownerId: true, isActive: true },
  });
  if (!workspace || !workspace.isActive) notFound();

  // 检查企业是否配置了 AI 服务
  const aiConfig = await db.aiServiceConfig
    .findUnique({
      where: { userId: workspace.ownerId },
      select: { enabled: true },
    })
    .catch(() => null);

  const aiEnabled = Boolean(aiConfig?.enabled);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-8 sm:py-12">
      <header className="border-b border-gray-200 pb-6">
        <Link href="/" className="text-xs text-gray-500 hover:text-[#6F8F4E]">
          ← 返回首页
        </Link>
        <h1 className="mt-3 text-2xl font-black text-gray-900">AI 客服</h1>
        <p className="mt-1 text-sm text-gray-500">{workspace.name}</p>
      </header>

      <section className="flex flex-1 items-center justify-center py-16 text-center">
        {aiEnabled ? (
          <div>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#6F8F4E]/10 text-2xl">
              🤖
            </div>
            <p className="text-sm text-gray-600">AI 客服正在准备中</p>
            <p className="mt-1 text-xs text-gray-400">请通过主页下方入口与 AI 客服对话</p>
          </div>
        ) : (
          <div>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-2xl">
              💤
            </div>
            <p className="text-sm text-gray-400">该企业暂未启用 AI 客服</p>
          </div>
        )}
      </section>
    </main>
  );
}
