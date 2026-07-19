import Link from "next/link";
import { redirect } from "next/navigation";
import {
  UserPlus,
  BarChart3,
  Package,
  ArrowRight,
  Crown,
  ShieldCheck,
  Building2,
  FileText,
  Bot,
  Link2,
  Palette,
  TrendingUp,
} from "lucide-react";
import ConsoleShell from "@/components/layout/ConsoleShell";
import { db } from "@/lib/db";
import { getCurrentUserFromCookies } from "@/lib/auth";

export const runtime = "nodejs";

export default async function ConsoleHomePage() {
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

  const [products, leads, activeLeads, knowledgeDocs, aiConfig, membership, shortLinks] =
    await Promise.all([
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
      db.shortLink.count({ where: { userId: user.id } }),
    ]);

  const productCount = products.length;
  const isMember = membership?.status === "active";
  const aiEnabled = aiConfig?.enabled ?? false;
  const planLabel = isMember
    ? ({ free: "免费版", starter: "初创版", pro: "专业版", enterprise: "企业版" } as Record<string, string>)[
        membership?.planCode ?? "free"
      ] ?? "免费版"
    : "免费版";

  const latestLeads = profileId
    ? await db.lead.findMany({
        where: { profileId },
        orderBy: { createdAt: "desc" },
        take: 3,
      })
    : [];

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

  const quickStats = [
    { label: "产品数量", value: productCount, icon: Package, tone: "bg-[#DDE8CD] text-[#3F5F31]", href: "/workbench/products" },
    { label: "客户线索", value: leads, icon: UserPlus, tone: "bg-[#EAF3FF] text-[#2563EB]", href: "/workbench/leads" },
    { label: "新 Lead", value: activeLeads, icon: UserPlus, tone: "bg-[#FFE6E2] text-[#B42318]", href: "/workbench/leads" },
    { label: "AI 状态", value: aiEnabled ? "已开启" : "未开启", icon: Bot, tone: aiEnabled ? "bg-[#6F8F4E] text-white" : "bg-[#FFE6E2] text-[#B42318]", href: "/workbench/ai" },
    { label: "会员状态", value: planLabel, icon: Crown, tone: "bg-[#F6E7C8] text-[#8C612E]", href: "/workbench/membership" },
  ];

  const nextSteps = [
    {
      label: "装修我的名片",
      href: "/dashboard",
      icon: Palette,
      tone: "bg-[#DDE8CD] text-[#3F5F31]",
      desc: profile?.displayName
        ? "继续优化你的名片展示、主题和链接。"
        : "先完善你的个人或企业信息，生成专属名片。",
      done: !!profile?.displayName,
    },
    {
      label: "添加产品与服务",
      href: "/workbench/products",
      icon: Building2,
      tone: "bg-[#EAF3FF] text-[#2563EB]",
      desc: productCount > 0 ? "继续添加更多产品或管理现有产品。" : "让访客和 AI 客服了解你可以提供什么服务。",
      done: productCount > 0,
    },
    {
      label: "开启 AI 客服",
      href: "/workbench/ai-service",
      icon: Bot,
      tone: "bg-[#F6E7C8] text-[#8C612E]",
      desc: aiEnabled ? "AI 客服已在工作，你可以调整配置。" : "基于你的资料自动回答客户咨询。",
      done: aiEnabled,
    },
    {
      label: "升级会员 & 额度",
      href: "/workbench/membership",
      icon: Crown,
      tone: "bg-[#FFE6E2] text-[#B42318]",
      desc: isMember ? "你已是会员，享受更多高级功能。" : "解锁更多 AI 调用、自定义域名与数据统计。",
      done: isMember,
    },
  ];

  return (
    <ConsoleShell
      eyebrow="Console"
      title="经营概览"
      subtitle="一站式管理你的名片、产品、客户线索、短链接、AI 客服与数据分析。"
    >
      {/* 欢迎卡 + 会员状态 */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-[28px] border border-[#E8DCCB] bg-gradient-to-br from-[#6F8F4E] to-[#3F5F31] p-5 text-white shadow-sm sm:col-span-2 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-white/70">欢迎回来</p>
              <h2 className="mt-1 truncate text-2xl font-black sm:text-3xl">
                {profile?.displayName || user.email}
              </h2>
              <p className="mt-2 text-sm text-white/80">
                今天是经营的好日子，一起来看看你的数据吧。
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-black backdrop-blur">
              {planLabel}
            </span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-black text-[#3F5F31] transition hover:bg-white/90"
            >
              <Palette className="size-4" />
              装修名片
            </Link>
            <Link
              href="/workbench/leads"
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-black text-white backdrop-blur transition hover:bg-white/25"
            >
              <UserPlus className="size-4" />
              查看线索
              {activeLeads > 0 ? (
                <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-black text-[#B42318]">
                  {activeLeads} 条待处理
                </span>
              ) : null}
            </Link>
          </div>
        </div>

        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-[#F5F0E6] text-[#2B241E]">
              <ShieldCheck className="size-4" />
            </span>
            <p className="text-sm font-black text-[#3F5F31]">账户状态</p>
          </div>
          <div className="mt-3 grid gap-2 text-sm">
            <div className="flex items-center justify-between rounded-2xl bg-[#F7F1E7] px-3 py-2">
              <span className="text-xs font-semibold text-[#7A6D5E]">邮箱</span>
              <span className="truncate font-bold text-[#2B241E]">{user.email}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-[#F7F1E7] px-3 py-2">
              <span className="text-xs font-semibold text-[#7A6D5E]">会员</span>
              <span className={`font-black ${isMember ? "text-[#6F8F4E]" : "text-[#8C612E]"}`}>
                {planLabel}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-[#F7F1E7] px-3 py-2">
              <span className="text-xs font-semibold text-[#7A6D5E]">邮箱验证</span>
              <span className={`font-black ${user.emailVerified ? "text-[#6F8F4E]" : "text-[#B42318]"}`}>
                {user.emailVerified ? "已验证" : "未验证"}
              </span>
            </div>
          </div>
          <Link
            href="/workbench/account"
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-[#2B241E] px-4 text-sm font-black text-white"
          >
            账户设置 →
          </Link>
        </div>
      </section>

      {/* 快速数据卡片 */}
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
            <p className="mt-2 text-3xl font-black tracking-tight text-[#2B241E]">
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
            <p className="mt-3 text-xs font-bold text-[#6F8F4E]">查看详情 →</p>
          </Link>
        ))}
      </section>

      {/* 下一步建议 */}
      <section className="mt-6 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-[#DDE8CD] text-[#3F5F31]">
            <TrendingUp className="size-4" />
          </span>
          <div>
            <p className="text-sm font-black text-[#3F5F31]">经营指南</p>
            <h2 className="mt-0.5 text-xl font-black text-[#2B241E]">快速开启你的 Link168 经营</h2>
          </div>
        </div>
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
                    <span className="rounded-full bg-[#DDE8CD] px-2 py-0.5 text-[10px] font-black text-[#3F5F31]">
                      已完成
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-[#7A6D5E]">{desc}</p>
              </div>
              <ArrowRight aria-hidden className="ml-auto size-4 shrink-0 text-[#6F8F4E]" />
            </Link>
          ))}
        </div>
      </section>

      {/* 最新线索 + 产品 + 数据 */}
      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <Link
          href="/workbench/leads"
          className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm transition hover:bg-[#F7F1E7]/50"
        >
          <p className="text-sm font-black text-[#3F5F31]">最新客户线索</p>
          <p className="mt-1 text-xs text-[#7A6D5E]">
            共 {leads} 条线索，{activeLeads} 条待处理。
          </p>
          {latestLeads.length > 0 ? (
            <ul className="mt-3 grid gap-2 text-sm">
              {latestLeads.map((lead) => (
                <li
                  key={lead.id}
                  className="flex items-center justify-between rounded-2xl bg-[#F7F1E7] px-3 py-2"
                >
                  <span className="truncate font-bold text-[#2B241E]">
                    {lead.name || lead.email || lead.phone || "匿名访客"}
                    {lead.sourceComponent ? ` · ${lead.sourceComponent}` : ""}
                  </span>
                  <span className="shrink-0 text-xs text-[#7A6D5E]">
                    {formatTime(lead.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-center text-sm text-[#7A6D5E]">
              还没有线索，开启 AI 客服获取更多咨询。
            </p>
          )}
        </Link>

        <Link
          href="/workbench/products"
          className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm transition hover:bg-[#F7F1E7]/50"
        >
          <p className="text-sm font-black text-[#3F5F31]">产品与服务</p>
          <p className="mt-1 text-xs text-[#7A6D5E]">共 {productCount} 个产品。</p>
          {products.length > 0 ? (
            <ul className="mt-3 grid gap-2 text-sm">
              {products.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-2xl bg-[#F7F1E7] px-3 py-2"
                >
                  <span className="truncate font-bold text-[#2B241E]">{p.name}</span>
                  <span className="shrink-0 text-xs text-[#7A6D5E]">
                    {p.priceText || (p.status === "published" ? "在售" : "草稿")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-center text-sm text-[#7A6D5E]">
              还没有产品，先添加你的第一个产品。
            </p>
          )}
        </Link>

        <Link
          href="/workbench/analytics"
          className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm transition hover:bg-[#F7F1E7]/50"
        >
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-[#E8E6FF] text-[#3D48B8]">
              <BarChart3 className="size-4" />
            </span>
            <div>
              <p className="text-sm font-black text-[#3F5F31]">数据分析</p>
              <p className="text-[11px] text-[#7A6D5E]">查看访问趋势与渠道效果</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-[#F7F1E7] p-3 text-center">
              <p className="text-xl font-black text-[#2B241E]">{leads}</p>
              <p className="text-[10px] font-bold text-[#7A6D5E]">总线索</p>
            </div>
            <div className="rounded-2xl bg-[#F7F1E7] p-3 text-center">
              <p className="text-xl font-black text-[#2B241E]">{shortLinks}</p>
              <p className="text-[10px] font-bold text-[#7A6D5E]">短链接</p>
            </div>
            <div className="rounded-2xl bg-[#F7F1E7] p-3 text-center">
              <p className="text-xl font-black text-[#2B241E]">{productCount}</p>
              <p className="text-[10px] font-bold text-[#7A6D5E]">产品数</p>
            </div>
            <div className="rounded-2xl bg-[#F7F1E7] p-3 text-center">
              <p className="text-xl font-black text-[#2B241E]">
                {knowledgeDocs}
              </p>
              <p className="text-[10px] font-bold text-[#7A6D5E]">知识文档</p>
            </div>
          </div>
          <div className="mt-4 text-center text-xs font-bold text-[#6F8F4E]">
            查看完整数据 →
          </div>
        </Link>
      </section>

      {/* 快捷入口网格 */}
      <section className="mt-6 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-black text-[#3F5F31]">全部功能</p>
        <h2 className="mt-1 text-xl font-black text-[#2B241E]">快速进入</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
          {[
            { label: "名片装修", href: "/dashboard", icon: Palette, tone: "bg-[#DDE8CD] text-[#3F5F31]" },
            { label: "产品服务", href: "/workbench/products", icon: Package, tone: "bg-[#EAF3FF] text-[#2563EB]" },
            { label: "客户线索", href: "/workbench/leads", icon: UserPlus, tone: "bg-[#FFE6E2] text-[#B42318]" },
            { label: "短链接", href: "/workbench/short-links", icon: Link2, tone: "bg-[#E8E6FF] text-[#3D48B8]" },
            { label: "数据分析", href: "/workbench/analytics", icon: BarChart3, tone: "bg-[#E8E6FF] text-[#3D48B8]" },
            { label: "AI 助手", href: "/workbench/ai", icon: Bot, tone: "bg-[#F6E7C8] text-[#8C612E]", badge: "Beta" },
            { label: "会员套餐", href: "/workbench/membership", icon: Crown, tone: "bg-[#F6E7C8] text-[#8C612E]" },
            { label: "账户设置", href: "/workbench/account", icon: ShieldCheck, tone: "bg-[#F5F0E6] text-[#2B241E]" },
          ].map(({ label, href, icon: Icon, tone, badge }) => (
            <Link
              key={label}
              href={href}
              className="link168-button-press flex flex-col items-center gap-2 rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] p-4 text-center transition hover:bg-white"
            >
              <span className={`grid size-11 place-items-center rounded-2xl ${tone}`}>
                <Icon aria-hidden className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-[#2B241E]">{label}</p>
                {badge ? (
                  <p className="text-[9px] font-bold text-[#8C612E]">{badge}</p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </ConsoleShell>
  );
}
