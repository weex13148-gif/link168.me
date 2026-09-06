import Link from "next/link";
import { redirect } from "next/navigation";
import { jeepworkPageSuperAdminOnly } from "@/lib/jeepwork-auth";
import { currentDb } from "@/lib/current/data/prisma-current";

export const dynamic = "force-dynamic";

export default async function CurrentJeepworkPage() {
  const user = await jeepworkPageSuperAdminOnly();
  if (!user) redirect("/jeepwork/login");

  const [pages, workspaces, recentAudits] = await Promise.all([
    currentDb.currentPage.count(),
    currentDb.currentWorkspace.count({ where: { isActive: true } }),
    currentDb.currentAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
  ]);

  return (
    <main className="min-h-dvh bg-[#F7F2E9] px-4 py-8 text-[#151515] sm:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-4 rounded-[28px] border border-[#DDD6CC] bg-[#FFFDF9] p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0B4DD8]">CURRENT Platform</p>
            <h1 className="mt-2 text-3xl font-bold">Jeepwork 控制平面</h1>
            <p className="mt-2 text-sm text-[#5E5A54]">只查看 CURRENT workspace、page 与 audit boundary，不读取 legacy business tables。</p>
          </div>
          <Link href="/jeepwork/login" className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-[#DDD6CC] bg-white px-4 text-sm font-bold">退出平台</Link>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            ["Active Workspaces", workspaces],
            ["CURRENT Pages", pages],
            ["Recent Audit", recentAudits.length],
          ].map(([label, value]) => (
            <article key={label} className="rounded-[22px] border border-[#DDD6CC] bg-[#FFFDF9] p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B847B]">{label}</p>
              <p className="mt-3 text-3xl font-bold">{value}</p>
            </article>
          ))}
        </section>

        <section className="rounded-[22px] border border-[#DDD6CC] bg-[#FFFDF9] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-xl font-bold">CURRENT Audit Log</h2><p className="mt-1 text-sm text-[#5E5A54]">平台操作以 CurrentAuditLog 为事实边界。</p></div>
            <Link href="/jeepwork/audit" className="text-sm font-bold text-[#0B4DD8]">查看审计</Link>
          </div>
          <div className="mt-4 divide-y divide-[#EEE7DD]">
            {recentAudits.length === 0 ? <p className="py-4 text-sm text-[#8B847B]">暂无 CURRENT 审计记录。</p> : recentAudits.map((entry) => (
              <div key={entry.id} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="font-bold">{entry.action} · {entry.targetType}</span>
                <span className="text-xs text-[#8B847B]">{entry.createdAt.toISOString()}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
