import Link from "next/link";
import { redirect } from "next/navigation";
import { UserPlus, MessageSquare, Sparkles, Package, ArrowRight, Crown, ShieldCheck, Building2, FileText } from "lucide-react";
import WorkbenchShell from "@/components/workbench/WorkbenchShell";
import { db } from "@/lib/db";
import { getCurrentUserFromCookies } from "@/lib/auth";

export const runtime = "nodejs";

export default async function WorkbenchHomePage() {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect("/login");

  const profile = await db.profile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
    },
  });

  const profileId = profile?.id;

  const [products, leads, activeLeads, knowledgeDocs, aiConfig, membership] = await Promise.all([
    db.product.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    profileId
      ? db.lead.count({ where: { profileId } })
      : Promise.resolve(0),
    profileId
      ? db.lead.count({ where: { profileId, status: "new" } })
      : Promise.resolve(0),
    db.knowledgeDoc.count({ where: { userId: user.id } }),
    db.aiServiceConfig.findUnique({ where: { userId: user.id } }),
    db.membershipSubscription.findUnique({ where: { userId: user.id } }),
  ]);

  const productCount = products.length;
  const isMember = membership?.status === "active";
  const aiEnabled = aiConfig?.enabled ?? false;

  const latestLeads = profileId
    ? await db.lead.findMany({
        where: { profileId },
        orderBy: { createdAt: "desc" },
        take: 3,
      })
    : [];

  const quickStats = [
    { label: "产品服务", value: productCount, icon: Package, tone: "bg-[#DDE8CD] text-[#3F5F31]", href: "/workbench/products" },
    { label: "客户线索", value: leads, icon: UserPlus, tone: "bg-[#EAF3FF] text-[#2563EB]", href: "/workbench/leads" },
    { label: "知识库文档", value: knowledgeDocs, icon: FileText, tone: "bg-[#F6E7C8] text-[#8C612E]", href: "/workbench/enterprise" },
    { label: "AI 客服", value: aiEnabled ? "已开启" : "未开启", icon: MessageSquare, tone: aiEnabled ? "bg-[#6F8F4E] text-white" : "bg-[#FFE6E2] text-[#B42318]", href: "/workbench/ai-service" },
  ];

  const nextSteps = [
    { label: "完善 AI 名片", href: "/workbench/card", icon: Sparkles, tone: "bg-[#DDE8CD] text-[#3F5F31]", desc: profile?.displayName ? "继续优化你的名片展示与 AI 介绍。" : "先完善你的个人或企业信息，生成专属 AI 名片。", done: !!profile?.displayName },
    { label: "添加产品与服务", href: "/workbench/products", icon: Building2, tone: "bg-[#EAF3FF] text-[#2563EB]", desc: productCount > 0 ? "继续添加更多产品或管理现有产品。" : "让访客和 AI 客服了解你可以提供什么服务。", done: productCount > 0 },
    { label: "开启 AI 客服", href: "/workbench/ai-service", icon: MessageSquare, tone: "bg-[#F6E7C8] text-[#8C612E]", desc: aiEnabled ? "AI 客服已在工作，你可以调整配置。" : "基于你的资料自动回答客户咨询。", done: aiEnabled },
    { label: "升级会员 & 额度", href: "/workbench/membership", icon: Crown, tone: "bg-[#FFE6E2] text-[#B42318]", desc: isMember ? "你已是会员，享受更多高级功能。" : "解锁更多 AI 调用、自定义域名与数据统计。", done: isMember },
  ];

  function formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;
    return date.toLocaleDateString("zh-CN");
  }

  return (
    <WorkbenchShell
      eyebrow="Workbench"
      title="工作台"
      subtitle="一站式管理你的 AI 名片、产品、企业资料、AI 客服、客户线索与数据中心。"
    >
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {quickStats.map(({ label, value, icon: Icon, tone, href }) => (
          <Link
            key={label}
            href={href}
            className="link168-button-press rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm transition hover:bg-[#F7F1E7]"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-[#7A6D5E]">{label}</p>
              <span className={`grid size-8 place-items-center rounded-xl ${tone}`}>
                <Icon aria-hidden className="size-4" />
              </span>
            </div>
            <p className="mt-2 text-3xl font-black tracking-tight text-[#2B241E]">{typeof value === "number" ? value.toLocaleString() : value}</p>
            <p className="mt-3 text-xs font-bold text-[#6F8F4E]">查看详情 →</p>
          </Link>
        ))}
      </section>

      <section className="mt-6 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-black text-[#3F5F31]">下一步建议</p>
        <h2 className="mt-1 text-2xl font-black text-[#2B241E]">快速开启你的 Link168 经营</h2>
        <p className="mt-1 text-xs text-[#7A6D5E]">根据你的当前进度，推荐以下操作。</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {nextSteps.map(({ label, href, icon: Icon, tone, desc, done }) => (
            <Link
              key={label}
              href={href}
              className="link168-button-press flex items-start gap-3 rounded-[24px] border border-[#E8DCCB] bg-[#F7F1E7] p-4 text-left transition hover:bg-white"
            >
              <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${tone}`}>
                <Icon aria-hidden className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-[#2B241E]">{label}</p>
                  {done ? (
                    <span className="rounded-full bg-[#DDE8CD] px-2 py-0.5 text-[10px] font-black text-[#3F5F31]">已完成</span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-[#7A6D5E]">{desc}</p>
              </div>
              <ArrowRight aria-hidden className="ml-auto size-4 shrink-0 text-[#6F8F4E]" />
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <Link href="/workbench/leads" className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
          <p className="text-sm font-black text-[#3F5F31]">最新客户线索</p>
          <p className="mt-1 text-xs text-[#7A6D5E]">共 {leads} 条线索，{activeLeads} 条待处理。</p>
          {latestLeads.length > 0 ? (
            <ul className="mt-3 grid gap-2 text-sm">
              {latestLeads.map((lead) => (
                <li key={lead.id} className="flex items-center justify-between rounded-2xl bg-[#F7F1E7] px-3 py-2">
                  <span className="truncate font-bold text-[#2B241E]">
                    {lead.name || lead.email || lead.phone || "匿名访客"}
                    {lead.sourceComponent ? ` · ${lead.sourceComponent}` : ""}
                  </span>
                  <span className="shrink-0 text-xs text-[#7A6D5E]">{formatTime(lead.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-center text-sm text-[#7A6D5E]">还没有线索，开启 AI 客服获取更多咨询。</p>
          )}
        </Link>

        <Link href="/workbench/products" className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
          <p className="text-sm font-black text-[#3F5F31]">产品与服务</p>
          <p className="mt-1 text-xs text-[#7A6D5E]">共 {productCount} 个产品。</p>
          {products.length > 0 ? (
            <ul className="mt-3 grid gap-2 text-sm">
              {products.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-2xl bg-[#F7F1E7] px-3 py-2">
                  <span className="truncate font-bold text-[#2B241E]">{p.name}</span>
                  <span className="shrink-0 text-xs text-[#7A6D5E]">
                    {p.priceText || (p.isActive ? "在售" : "草稿")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-center text-sm text-[#7A6D5E]">还没有产品，先添加你的第一个产品。</p>
          )}
        </Link>

        <Link href="/workbench/account" className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-[#F5F0E6] text-[#2B241E]">
              <ShieldCheck aria-hidden className="size-4" />
            </span>
            <p className="text-sm font-black text-[#3F5F31]">账号状态</p>
          </div>
          <div className="mt-3 grid gap-2 text-sm">
            <div className="flex items-center justify-between rounded-2xl bg-[#F7F1E7] px-3 py-2">
              <span className="text-xs font-semibold text-[#7A6D5E]">邮箱</span>
              <span className="truncate font-bold text-[#2B241E]">{user.email}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-[#F7F1E7] px-3 py-2">
              <span className="text-xs font-semibold text-[#7A6D5E]">会员状态</span>
              <span className={`font-black ${isMember ? "text-[#6F8F4E]" : "text-[#8C612E]"}`}>
                {isMember ? membership?.planCode?.toUpperCase() : "免费版"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-[#F7F1E7] px-3 py-2">
              <span className="text-xs font-semibold text-[#7A6D5E]">邮箱验证</span>
              <span className={`font-black ${user.emailVerified ? "text-[#6F8F4E]" : "text-[#B42318]"}`}>
                {user.emailVerified ? "已验证" : "未验证"}
              </span>
            </div>
          </div>
          <div className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-[#2B241E] px-4 text-sm font-black text-white">
            前往设置 →
          </div>
        </Link>
      </section>
    </WorkbenchShell>
  );
}
