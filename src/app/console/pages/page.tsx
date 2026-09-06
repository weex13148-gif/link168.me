import Link from "next/link";
import { redirect } from "next/navigation";

import { CurrentPageStatusBadge } from "@/components/current-page/states";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { ensureCurrentPersonalPageForUser, listCurrentPagesForActor } from "@/lib/current/page-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CurrentPagesHome() {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect("/login");

  const personalPage = await ensureCurrentPersonalPageForUser(user.id);
  if (!personalPage.ok) {
    return <CurrentPagesError title="页面初始化失败" message={personalPage.error.message} />;
  }

  const pages = await listCurrentPagesForActor(user.id);
  if (!pages.ok) {
    return <CurrentPagesError title="页面列表暂不可用" message={pages.error.message} />;
  }

  return (
    <main className="min-h-dvh bg-[#F7F2E9] px-4 py-10 sm:px-6">
      <section className="mx-auto max-w-[960px]">
        <header className="rounded-[28px] border border-[#DDD6CC] bg-[#FFFDF9] p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold tracking-[0.18em] text-[#0B4DD8]">商业主页</p>
          <h1 className="mt-3 text-3xl font-bold text-[#151515]">我的页面</h1>
          <p className="mt-3 text-base leading-7 text-[#5E5A54]">
            管理你的个人主页、团队主页和成员主页，让客户了解你的专业服务。
          </p>
          <Link href="/console/team" className="mt-4 inline-flex min-h-12 items-center rounded-[10px] border border-[#DDD6CC] bg-white px-4 text-sm font-bold text-[#0B4DD8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4DD8]">我的团队与成员</Link>
        </header>

        <div className="mt-5 grid gap-4">
          {pages.value.map((page) => {
            const publicPath = `/${page.publicIdentity}`;
            const isPublic = page.status === "published" || page.status === "draft_changes";

            return (
              <article key={page.pageId} className="rounded-[24px] border border-[#DDD6CC] bg-[#FFFDF9] p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex min-h-7 items-center rounded-full border border-[#DDD6CC] bg-white px-3 text-xs font-bold text-[#151515]">
                        {{ personal: "我的主页", team: "团队主页", member: "成员主页" }[page.kind]}
                      </span>
                      <CurrentPageStatusBadge status={page.status} />
                    </div>
                    <p className="mt-4 text-sm font-bold text-[#151515]">{page.workspaceName}</p>
                    <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[#5E5A54]">公开地址</p>
                    {isPublic ? (
                      <Link href={publicPath} className="mt-1 inline-block break-all text-sm font-bold text-[#0B4DD8] underline underline-offset-4">
                        {publicPath}
                      </Link>
                    ) : (
                      <p className="mt-1 break-all text-sm font-bold text-[#5E5A54]">{publicPath}（发布后可访问）</p>
                    )}
                  </div>
                  <Link
                    href={`/console/pages/${page.pageId}`}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-[14px] border border-[#0B4DD8] bg-[#0B4DD8] px-4 text-sm font-bold text-white transition hover:brightness-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4DD8] focus-visible:ring-offset-2"
                  >
                    打开编辑器
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function CurrentPagesError({ title, message }: { title: string; message: string }) {
  return (
    <main className="min-h-dvh bg-[#F7F2E9] px-4 py-10 sm:px-6">
      <section className="mx-auto max-w-[720px] rounded-[28px] border border-[#DDD6CC] bg-[#FFFDF9] p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold tracking-[0.18em] text-[#0B4DD8]">商业主页</p>
        <h1 className="mt-3 text-3xl font-bold text-[#151515]">{title}</h1>
        <p className="mt-3 text-base leading-7 text-[#5E5A54]">{message}</p>
        <p className="mt-5 rounded-[16px] border border-[#E6D8BE] bg-[#FFF7EA] px-4 py-3 text-sm text-[#9A650F]">
          你的账号仍然保留，请稍后重新加载。
        </p>
      </section>
    </main>
  );
}
