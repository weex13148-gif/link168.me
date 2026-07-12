import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  Crown,
  Home,
  Package,
  Palette,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  UserRound,
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

  const [recentProducts, productCount, leads, activeLeads, knowledgeDocs, aiConfig, membership, shortLinks] =
    await Promise.all([
      db.product.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      db.product.count({ where: { userId: user.id } }),
      profileId ? db.lead.count({ where: { profileId } }) : Promise.resolve(0),
      profileId
        ? db.lead.count({ where: { profileId, status: "new" } })
        : Promise.resolve(0),
      db.knowledgeDoc.count({ where: { userId: user.id } }),
      db.aiServiceConfig.findUnique({ where: { userId: user.id } }),
      db.membershipSubscription.findUnique({ where: { userId: user.id } }),
      db.shortLink.count({ where: { userId: user.id } }),
    ]);

  const isMember = membership?.status === "active";
  const aiEnabled = aiConfig?.enabled ?? false;
  const planLabel = isMember
    ? ({
        free: "免费版",
        starter: "初创版",
        plus: "Plus",
        pro: "Pro",
        enterprise: "企业版",
        enterprise_pro: "企业Pro",
      } as Record<string, string>)[membership?.planCode ?? "free"] ?? "免费版"
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
    {
      label: "产品服务",
      value: productCount,
      icon: Package,
      tone: "bg-[var(--ui-success-soft)] text-[var(--ui-brand)]",
      href: "/console/card",
    },
    {
      label: "客户线索",
      value: leads,
      icon: UserPlus,
      tone: "bg-[var(--ui-info-soft)] text-[var(--ui-info)]",
      href: "/console/customers",
    },
    {
      label: "短链接",
      value: shortLinks,
      icon: BarChart3,
      tone: "bg-[var(--ui-brand-soft)] text-[var(--ui-brand)]",
      href: "/console/card",
    },
    {
      label: "AI 接待",
      value: aiEnabled ? "已开启" : "未开启",
      icon: Bot,
      tone: aiEnabled
        ? "bg-[var(--ui-success)] text-white"
        : "bg-[var(--ui-danger-soft)] text-[var(--ui-danger)]",
      href: "/console/ai",
    },
  ];

  const nextSteps = [
    {
      label: "装修我的名片",
      href: "/console/card",
      icon: Palette,
      tone: "bg-[var(--ui-success-soft)] text-[var(--ui-brand)]",
      desc: profile?.displayName
        ? "继续优化你的名片展示、主题和链接。"
        : "先完善个人或企业信息，生成专属经营名片。",
      done: Boolean(profile?.displayName),
    },
    {
      label: "添加产品与服务",
      href: "/console/card",
      icon: Building2,
      tone: "bg-[var(--ui-info-soft)] text-[var(--ui-info)]",
      desc: productCount > 0
        ? "继续添加更多产品或管理现有产品。"
        : "让访客和AI接待了解你可以提供什么服务。",
      done: productCount > 0,
    },
    {
      label: "配置AI经营能力",
      href: "/console/ai",
      icon: Bot,
      tone: "bg-[var(--ui-warning-soft)] text-[var(--ui-warning)]",
      desc: aiEnabled ? "AI接待已启用，可以继续完善知识库。" : "配置访客接待、六大AI和统一资料库。",
      done: aiEnabled,
    },
    {
      label: "查看会员与额度",
      href: "/console/account",
      icon: Crown,
      tone: "bg-[var(--ui-danger-soft)] text-[var(--ui-danger)]",
      desc: isMember ? "查看当前套餐、额度和账号设置。" : "了解Plus、Pro和企业套餐权益。",
      done: isMember,
    },
  ];

  const sectionCards = [
    {
      label: "首页",
      href: "/console",
      icon: Home,
      tone: "bg-[var(--ui-surface-muted)] text-[var(--ui-brand)]",
      desc: "经营概览与待办",
    },
    {
      label: "名片",
      href: "/console/card",
      icon: Palette,
      tone: "bg-[var(--ui-success-soft)] text-[var(--ui-brand)]",
      desc: "资料、产品、链接与数据",
    },
    {
      label: "客户",
      href: "/console/customers",
      icon: UserPlus,
      tone: "bg-[var(--ui-danger-soft)] text-[var(--ui-danger)]",
      desc: "线索、状态与跟进",
    },
    {
      label: "AI",
      href: "/console/ai",
      icon: Bot,
      tone: "bg-[var(--ui-warning-soft)] text-[var(--ui-warning)]",
      desc: "六大AI、接待与知识库",
    },
    {
      label: "我的",
      href: "/console/account",
      icon: UserRound,
      tone: "bg-[var(--ui-surface-muted)] text-[var(--ui-ink)]",
      desc: "会员、企业与账号安全",
    },
  ];

  return (
    <ConsoleShell
      eyebrow="Console"
      title="经营概览"
      subtitle="通过首页、名片、客户、AI和我的五个入口管理Link168经营闭环。"
    >
      <section className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="min-w-0 rounded-[24px] border border-[var(--ui-line)] bg-gradient-to-br from-[var(--ui-success)] to-[var(--ui-brand)] p-4 text-white shadow-sm sm:col-span-2 sm:rounded-[28px] sm:p-6">
          <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-white/70">欢迎回来</p>
              <h2 className="mt-1 break-words text-2xl font-black sm:text-3xl">
                {profile?.displayName || user.email}
              </h2>
              <p className="mt-2 break-words text-sm leading-6 text-white/80">
                今天是经营的好日子，一起来看看你的数据和待办。
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--ui-surface)]/15 px-3 py-1 text-xs font-black backdrop-blur">
              {planLabel}
            </span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/console/card"
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--ui-surface)] px-4 text-sm font-black text-[var(--ui-brand)] transition hover:bg-[var(--ui-surface)]/90"
            >
              <Palette className="size-4" />
              装修名片
            </Link>
            <Link
              href="/console/customers"
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--ui-surface)]/15 px-4 text-sm font-black text-white backdrop-blur transition hover:bg-[var(--ui-surface)]/25"
            >
              <UserPlus className="size-4" />
              查看客户
              {activeLeads > 0 ? (
                <span className="rounded-full bg-[var(--ui-surface)] px-1.5 py-0.5 text-[10px] font-black text-[var(--ui-danger)]">
                  {activeLeads} 条待处理
                </span>
              ) : null}
            </Link>
          </div>
        </div>

        <div className="min-w-0 rounded-[24px] border border-[var(--ui-line)] bg-[var(--ui-surface)] p-4 shadow-sm sm:rounded-[28px] sm:p-5">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-[var(--ui-surface-muted)] text-[var(--ui-ink)]">
              <ShieldCheck className="size-4" />
            </span>
            <p className="text-sm font-black text-[var(--ui-brand)]">账户状态</p>
          </div>
          <div className="mt-3 grid gap-2 text-sm">
            <div className="flex min-w-0 items-center justify-between gap-2 rounded-2xl bg-[var(--ui-surface-muted)] px-3 py-2">
              <span className="shrink-0 text-xs font-semibold text-[var(--ui-muted)]">邮箱</span>
              <span className="min-w-0 truncate font-bold text-[var(--ui-ink)]">{user.email}</span>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-2xl bg-[var(--ui-surface-muted)] px-3 py-2">
              <span className="text-xs font-semibold text-[var(--ui-muted)]">会员</span>
              <span className={`font-black ${isMember ? "text-[var(--ui-success)]" : "text-[var(--ui-warning)]"}`}>
                {planLabel}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-2xl bg-[var(--ui-surface-muted)] px-3 py-2">
              <span className="text-xs font-semibold text-[var(--ui-muted)]">邮箱验证</span>
              <span className={`font-black ${user.emailVerified ? "text-[var(--ui-success)]" : "text-[var(--ui-danger)]"}`}>
                {user.emailVerified ? "已验证" : "未验证"}
              </span>
            </div>
          </div>
          <Link
            href="/console/account"
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-[var(--ui-ink)] px-4 text-sm font-black text-white"
          >
            进入我的 →
          </Link>
        </div>
      </section>

      <section className="mt-4 grid min-w-0 gap-3 sm:mt-6 sm:grid-cols-2 xl:grid-cols-4">
        {quickStats.map(({ label, value, icon: Icon, tone, href }) => (
          <Link
            key={label}
            href={href}
            className="link168-button-press min-w-0 rounded-[24px] border border-[var(--ui-line)] bg-[var(--ui-surface)] p-4 shadow-sm transition hover:bg-[var(--ui-surface-muted)] sm:rounded-[28px] sm:p-5"
          >
            <div className="flex min-w-0 items-center justify-between gap-3">
              <p className="min-w-0 truncate text-xs font-semibold text-[var(--ui-muted)]">{label}</p>
              <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${tone}`}>
                <Icon aria-hidden className="size-4" />
              </span>
            </div>
            <p className="mt-2 break-words text-3xl font-black tracking-tight text-[var(--ui-ink)]">
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
            <p className="mt-3 text-xs font-bold text-[var(--ui-success)]">进入对应分类 →</p>
          </Link>
        ))}
      </section>

      <section className="mt-4 min-w-0 rounded-[24px] border border-[var(--ui-line)] bg-[var(--ui-surface)] p-4 shadow-sm sm:mt-6 sm:rounded-[28px] sm:p-6">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--ui-success-soft)] text-[var(--ui-brand)]">
            <TrendingUp className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black text-[var(--ui-brand)]">经营指南</p>
            <h2 className="mt-0.5 break-words text-xl font-black text-[var(--ui-ink)]">
              快速开启你的Link168经营
            </h2>
          </div>
        </div>
        <p className="mt-1 text-xs leading-5 text-[var(--ui-muted)]">根据当前进度，推荐以下操作。</p>
        <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
          {nextSteps.map(({ label, href, icon: Icon, tone, desc, done }) => (
            <Link
              key={label}
              href={href}
              className="link168-button-press flex min-w-0 items-start gap-3 rounded-[20px] border border-[var(--ui-line)] bg-[var(--ui-surface-muted)] p-4 text-left transition hover:bg-[var(--ui-surface)] sm:rounded-[24px]"
            >
              <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${tone}`}>
                <Icon aria-hidden className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="break-words text-sm font-black text-[var(--ui-ink)]">{label}</p>
                  {done ? (
                    <span className="shrink-0 rounded-full bg-[var(--ui-success-soft)] px-2 py-0.5 text-[10px] font-black text-[var(--ui-brand)]">
                      已完成
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 break-words text-xs leading-5 text-[var(--ui-muted)]">{desc}</p>
              </div>
              <ArrowRight aria-hidden className="ml-auto size-4 shrink-0 text-[var(--ui-success)]" />
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-4 grid min-w-0 gap-4 sm:mt-6 lg:grid-cols-3">
        <Link
          href="/console/customers"
          className="min-w-0 rounded-[24px] border border-[var(--ui-line)] bg-[var(--ui-surface)] p-4 shadow-sm transition hover:bg-[var(--ui-surface-muted)]/50 sm:rounded-[28px] sm:p-5"
        >
          <p className="text-sm font-black text-[var(--ui-brand)]">最新客户线索</p>
          <p className="mt-1 text-xs text-[var(--ui-muted)]">共 {leads} 条线索，{activeLeads} 条待处理。</p>
          {latestLeads.length > 0 ? (
            <ul className="mt-3 grid min-w-0 gap-2 text-sm">
              {latestLeads.map((lead) => (
                <li
                  key={lead.id}
                  className="flex min-w-0 items-center justify-between gap-2 rounded-2xl bg-[var(--ui-surface-muted)] px-3 py-2"
                >
                  <span className="min-w-0 truncate font-bold text-[var(--ui-ink)]">
                    {lead.name || lead.email || lead.phone || "匿名访客"}
                    {lead.sourceComponent ? ` · ${lead.sourceComponent}` : ""}
                  </span>
                  <span className="shrink-0 text-xs text-[var(--ui-muted)]">{formatTime(lead.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-center text-sm leading-6 text-[var(--ui-muted)]">
              还没有线索，可以先配置AI接待或分享名片。
            </p>
          )}
        </Link>

        <Link
          href="/console/card"
          className="min-w-0 rounded-[24px] border border-[var(--ui-line)] bg-[var(--ui-surface)] p-4 shadow-sm transition hover:bg-[var(--ui-surface-muted)]/50 sm:rounded-[28px] sm:p-5"
        >
          <p className="text-sm font-black text-[var(--ui-brand)]">产品与服务</p>
          <p className="mt-1 text-xs text-[var(--ui-muted)]">共 {productCount} 个产品。</p>
          {recentProducts.length > 0 ? (
            <ul className="mt-3 grid min-w-0 gap-2 text-sm">
              {recentProducts.map((product) => (
                <li
                  key={product.id}
                  className="flex min-w-0 items-center justify-between gap-2 rounded-2xl bg-[var(--ui-surface-muted)] px-3 py-2"
                >
                  <span className="min-w-0 truncate font-bold text-[var(--ui-ink)]">{product.name}</span>
                  <span className="shrink-0 text-xs text-[var(--ui-muted)]">
                    {product.priceText || (product.isActive ? "在售" : "草稿")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-center text-sm leading-6 text-[var(--ui-muted)]">
              还没有产品，进入名片分类添加第一个产品。
            </p>
          )}
        </Link>

        <Link
          href="/console/card"
          className="min-w-0 rounded-[24px] border border-[var(--ui-line)] bg-[var(--ui-surface)] p-4 shadow-sm transition hover:bg-[var(--ui-surface-muted)]/50 sm:rounded-[28px] sm:p-5"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--ui-brand-soft)] text-[var(--ui-brand)]">
              <BarChart3 className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black text-[var(--ui-brand)]">经营数据</p>
              <p className="break-words text-[11px] text-[var(--ui-muted)]">访问、渠道、产品和资料摘要</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              ["总线索", leads],
              ["短链接", shortLinks],
              ["产品数", productCount],
              ["知识文档", knowledgeDocs],
            ].map(([label, value]) => (
              <div key={String(label)} className="min-w-0 rounded-2xl bg-[var(--ui-surface-muted)] p-3 text-center">
                <p className="break-words text-xl font-black text-[var(--ui-ink)]">{Number(value).toLocaleString()}</p>
                <p className="truncate text-[10px] font-bold text-[var(--ui-muted)]">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center text-xs font-bold text-[var(--ui-success)]">进入名片数据工具 →</div>
        </Link>
      </section>

      <section className="mt-4 min-w-0 rounded-[24px] border border-[var(--ui-line)] bg-[var(--ui-surface)] p-4 shadow-sm sm:mt-6 sm:rounded-[28px] sm:p-6">
        <p className="text-sm font-black text-[var(--ui-brand)]">五个正式分类</p>
        <h2 className="mt-1 break-words text-xl font-black text-[var(--ui-ink)]">快速进入</h2>
        <div className="mt-4 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {sectionCards.map(({ label, href, icon: Icon, tone, desc }) => (
            <Link
              key={label}
              href={href}
              className="link168-button-press flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface-muted)] p-3 text-center transition hover:bg-[var(--ui-surface)] sm:p-4"
            >
              <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${tone}`}>
                <Icon aria-hidden className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[var(--ui-ink)]">{label}</p>
                <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[var(--ui-muted)]">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </ConsoleShell>
  );
}
