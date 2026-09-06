import Link from "next/link";

import { getCurrentUserFromCookies } from "@/lib/auth";
import { draftToRenderModel } from "@/components/current-page/adapters";
import { CurrentPageRenderer } from "@/components/current-page/renderer";
import { CurrentPreviewBanner, CurrentPublicState, CurrentViewportFrame } from "@/components/current-page/states";
import { PrismaCurrentPageRepository } from "@/lib/current/repositories/prisma-current-page-repository";
import { getCurrentPageContext } from "@/lib/current/page-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const repository = new PrismaCurrentPageRepository();

export default async function CurrentPagePreview({ params }: { params: Promise<{ pageId: string }> }) {
  const user = await getCurrentUserFromCookies();
  if (!user) return <CurrentPublicState title="需要登录" description="请登录后查看 Draft 预览。" action={{ label: "返回登录", href: "/login" }} />;

  const { pageId } = await params;
  const context = await getCurrentPageContext(user.id, pageId, "read");
  if (!context.ok) return <CurrentPublicState title="预览不可用" description={context.error.message} />;

  const [draft, publication] = await Promise.all([repository.getDraft(pageId), repository.getPublication(pageId)]);
  if (!draft.ok) return <CurrentPublicState title="Draft 尚未就绪" description="CURRENT repository 尚未返回 Draft；预览不会读取 Published 或生成假数据。" action={{ label: "返回页面编辑", href: `/console/pages/${pageId}` }} />;

  const status = publication.ok ? publication.value.status : "draft_only";
  const model = draftToRenderModel(draft.value, status);
  return (
    <main className="min-h-dvh bg-[#F7F2E9] px-3 py-4 sm:px-6 sm:py-6 lg:px-10">
      <div className="mx-auto grid w-full max-w-[1240px] gap-4">
        <CurrentPreviewBanner
          boundary={model.boundary as Extract<typeof model.boundary, { source: "draft" }>}
          pageStatus={status}
          publishAction={{ label: "回到编辑并 Publish", href: `/console/pages/${pageId}`, kind: "primary" }}
        />
        <CurrentViewportFrame viewport="mobile">
          <CurrentPageRenderer model={model} />
        </CurrentViewportFrame>
        <Link href={`/console/pages/${pageId}`} className="mx-auto inline-flex min-h-11 items-center justify-center rounded-[14px] border border-[#DDD6CC] bg-white px-4 text-sm font-bold text-[#151515] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4DD8]">返回编辑器</Link>
      </div>
    </main>
  );
}

