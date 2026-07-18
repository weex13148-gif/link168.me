import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Bot,
  Package,
  Palette,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import ConsoleShell from "@/components/layout/ConsoleShell";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { db } from "@/lib/db";
import { toMainlinePlanLabel } from "@/lib/product/mainline";

export const runtime = "nodejs";

function formatTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  return date.toLocaleDateString("zh-CN");
}

export default async function ConsoleHomePage() {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect("/login");

  const profile = await db.profile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      displayName: true,
      isPublic: true,
    },
  });
  const profileId = profile?.id;

  const [
    productCount,
    leadCount,
    newLeadCount,
    latestLeads,
    aiConfig,
    membership,
  ] = await Promise.all([
    db.product.count({ where: { userId: user.id } }),
    profileId ? db.lead.count({ where: { profileId } }) : Promise.resolve(0),
    profileId
      ? db.lead.count({ where: { profileId, status: "new" } })
      : Promise.resolve(0),
    profileId
      ? db.lead.findMany({
          where: { profileId },
          orderBy: { createdAt: "desc" },
          take: 3,
        })
      : Promise.resolve([]),
    db.aiServiceConfig.findUnique({ where: { userId: user.id } }),
    db.membershipSubscription.findUnique({ where: { userId: user.id } }),
  ]);

  const planLabel = toMainlinePlanLabel(membership?.planCode);
  const isPublished = Boolean(profile?.isPublic);
  const hasRealLead = latestLeads.length > 0;
  const primaryAction = !profile
    ? {
        label: "开始创建专业名片",
        href: "/onboarding",
      }
    : !profile.isPublic
      ? {
          label: "预览并发布名片",
          href: "/dashboard?tab=share",
        }
      : hasRealLead
        ? {
            label: "处理最近客户",
            href: "/workbench/leads",
          }
        : {
            label: "分享名片获得咨询",
            href: "/dashboard?tab=share",
          };

  const secondaryCards = [
    {
      label: "产品与服务",
      detail: productCount > 0 ? `已添加 ${productCount} 个产品与服务` : "添加产品与服务，方便访客了解你的业务。",
      href: "/workbench/products",
      icon: Package,
      tone: "bg-[#DDE8CD] text-[#3F5F31]",
    },
    {
      label: "AI 接待",
      detail: aiConfig?.enabled ? "访客接待已开启，可继续调整接待设置。" : "设置访客接待，让常见咨询得到及时回复。",
      href: "/workbench/ai",
      icon: Bot,
      tone: "bg-[#F6E7C8] text-[#8C612E]",
    },
    {
      label: "数据分析",
      detail: "查看访问趋势与渠道效果。",
      href: "/workbench/analytics",
      icon: BarChart3,
      tone: "bg-[#E8E6FF] text-[#3D48B8]",
    },
    {
      label: "账户与安全",
      detail: `${user.emailVerified ? "邮箱已验证" : "邮箱尚未验证"} · ${planLabel}`,
      href: "/workbench/account",
      icon: ShieldCheck,
      tone: "bg-[#EAF3FF] text-[#2563EB]",
    },
  ];

  return (
    <ConsoleShell
      eyebrow="Home"
      title="首页"
      subtitle="先完成并发布名片，再接待与跟进真实客户咨询。"
    >
      <section className="rounded-[28px] border border-[#E8DCCB] bg-gradient-to-br from-[#6F8F4E] to-[#3F5F31] p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-white/70">名片完成与发布</p>
            <h2 className="mt-1 text-2xl font-black sm:text-3xl">发布状态：{isPublished ? "已发布" : "未发布"}</h2>
            <p className="mt-2 text-sm text-white/80">
              {profile
                ? isPublished
                  ? "名片已可被访客访问。"
                  : "预览后发布名片，让访客可以找到你。"
                : "创建专业名片，开始展示你的业务。"}
            </p>
          </div>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black backdrop-blur">
            {planLabel}
          </span>
        </div>
        <Link
          href={primaryAction.href}
          className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-black text-[#3F5F31] transition hover:bg-white/90"
        >
          <Palette aria-hidden className="size-4" />
          下一步：
          {primaryAction.label}
        </Link>
      </section>

      <section className="mt-6 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-[#3F5F31]">最近客户</p>
            <h2 className="mt-1 text-xl font-black text-[#2B241E]">最近三条真实 Lead</h2>
          </div>
          <Link href="/workbench/leads" className="text-xs font-black text-[#6F8F4E]">
            查看全部 →
          </Link>
        </div>
        {latestLeads.length > 0 ? (
          <ul className="mt-4 grid gap-2 text-sm">
            {latestLeads.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[#F7F1E7] px-3 py-3">
                <span className="min-w-0 truncate font-bold text-[#2B241E]">
                  {lead.name || lead.email || lead.phone || "匿名访客"}
                  {lead.sourceComponent ? ` · ${lead.sourceComponent}` : ""}
                </span>
                <span className="shrink-0 text-xs text-[#7A6D5E]">{formatTime(lead.createdAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-2xl bg-[#F7F1E7] p-4 text-sm text-[#7A6D5E]">
            暂无客户咨询。发布并分享名片后，新的 Lead 会显示在这里。
          </p>
        )}
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: "客户线索", value: leadCount, href: "/workbench/leads", icon: UserPlus },
          { label: "新 Lead", value: newLeadCount, href: "/workbench/leads", icon: UserPlus },
          { label: "产品与服务", value: productCount, href: "/workbench/products", icon: Package },
        ].map(({ label, value, href, icon: Icon }) => (
          <Link key={label} href={href} className="rounded-[24px] border border-[#E8DCCB] bg-white p-4 shadow-sm transition hover:bg-[#F7F1E7]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#7A6D5E]">{label}</p>
              <Icon aria-hidden className="size-4 text-[#6F8F4E]" />
            </div>
            <p className="mt-2 text-3xl font-black text-[#2B241E]">{value.toLocaleString()}</p>
            <p className="mt-2 text-xs font-bold text-[#6F8F4E]">查看详情 →</p>
          </Link>
        ))}
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {secondaryCards.map(({ label, detail, href, icon: Icon, tone }) => (
          <Link key={label} href={href} className="rounded-[24px] border border-[#E8DCCB] bg-white p-4 shadow-sm transition hover:bg-[#F7F1E7]">
            <span className={`grid size-10 place-items-center rounded-2xl ${tone}`}>
              <Icon aria-hidden className="size-5" />
            </span>
            <p className="mt-3 text-sm font-black text-[#2B241E]">{label}</p>
            <p className="mt-1 text-xs text-[#7A6D5E]">{detail}</p>
          </Link>
        ))}
      </section>
    </ConsoleShell>
  );
}
