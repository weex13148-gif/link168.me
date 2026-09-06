import { redirect } from "next/navigation";

import { getCurrentUserFromCookies } from "@/lib/auth";
import { ensureCurrentPersonalPageForUser } from "@/lib/current/page-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ConsoleHomePage() {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect("/login");

  const page = await ensureCurrentPersonalPageForUser(user.id);
  if (page.ok) redirect(`/console/pages/${page.value.pageId}`);

  return (
    <main className="min-h-dvh bg-[#F7F2E9] px-4 py-10 sm:px-6">
      <section className="mx-auto max-w-[720px] rounded-[28px] border border-[#DDD6CC] bg-[#FFFDF9] p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0B4DD8]">CURRENT Console</p>
        <h1 className="mt-3 text-3xl font-bold text-[#151515]">个人页面初始化失败</h1>
        <p className="mt-3 text-base leading-7 text-[#5E5A54]">{page.error.message}</p>
        <p className="mt-5 rounded-[16px] border border-[#E6D8BE] bg-[#FFF7EA] px-4 py-3 text-sm text-[#9A650F]">账号已保留；CURRENT 页面未创建成功，也不会使用旧版 profile 或假数据替代。</p>
      </section>
    </main>
  );
}
