import { getCurrentUserFromCookies } from "@/lib/auth";
import { CurrentPageEditor } from "@/components/current-page/editor";
import { CurrentPublishStatePanel } from "@/components/current-page/states";
import { CurrentPublicState } from "@/components/current-page/states";
import { PrismaCurrentPageRepository } from "@/lib/current/repositories/prisma-current-page-repository";
import { getCurrentPageContext } from "@/lib/current/page-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const repository = new PrismaCurrentPageRepository();

export default async function CurrentPageEditorRoute({ params }: { params: Promise<{ pageId: string }> }) {
  const user = await getCurrentUserFromCookies();
  if (!user) return <CurrentPublicState title="需要登录" description="请登录后编辑 CURRENT 页面。" action={{ label: "返回登录", href: "/login" }} />;

  const { pageId } = await params;
  const context = await getCurrentPageContext(user.id, pageId, "read");
  if (!context.ok) return <CurrentPublicState title="页面不可用" description={context.error.message} />;

  const [draft, publication] = await Promise.all([repository.getDraft(pageId), repository.getPublication(pageId)]);
  if (!draft.ok) {
    return <CurrentPublicState title="Draft 尚未就绪" description="CURRENT repository 尚未返回 Draft；页面不会使用假数据。" />;
  }

  const status = publication.ok ? publication.value.status : "draft_only";
  const boundary = {
    source: "draft" as const,
    draftLabel: `Draft revision ${draft.value.revision}`,
    publicWarning: "Preview / editor 只读写 Draft；Publish 成功前不改变公开页面。",
    publishedVersionLabel: publication.ok ? publication.value.publishedVersionId : null,
  };

  return (
    <main className="min-h-dvh bg-[#F7F2E9] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <div className="mx-auto grid w-full max-w-[1240px] gap-5">
        <header className="rounded-[24px] border border-[#DDD6CC] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0B4DD8]">CURRENT Page</p>
          <h1 className="mt-2 text-2xl font-bold text-[#151515] sm:text-3xl">编辑 @{context.value.page.publicIdentity}</h1>
          <p className="mt-2 text-sm leading-6 text-[#5E5A54]">Personal page · workspace {context.value.page.workspaceId}</p>
        </header>
        <CurrentPublishStatePanel boundary={boundary} status={status} />
        <CurrentPageEditor pageId={pageId} initialDraft={draft.value} initialStatus={status} />
      </div>
    </main>
  );
}
