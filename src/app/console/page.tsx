import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Eye,
  MessageCircle,
  Radio,
  Share2,
  UserPlus,
  Users,
} from "lucide-react";
import ConsoleShell from "@/components/layout/ConsoleShell";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCoreMvpMetrics } from "@/lib/analytics";
import { isOnboardingProfileReady } from "@/lib/onboarding";

export const runtime = "nodejs";

type ConsoleHomePageProps = {
  searchParams: Promise<{ welcome?: string }>;
};

export default async function ConsoleHomePage({ searchParams }: ConsoleHomePageProps) {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect("/login");

  const query = await searchParams;
  const profile = await db.profile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      isPublic: true,
      createdAt: true,
    },
  });

  const ready = isOnboardingProfileReady(profile);
  const [newLeads, totalLeads, metrics] = profile
    ? await Promise.all([
        db.lead.count({ where: { profileId: profile.id, status: "new" } }),
        db.lead.count({ where: { profileId: profile.id } }),
        getCoreMvpMetrics(profile.id, {
          from: profile.createdAt,
          to: new Date(Date.now() + 1_000),
        }),
      ])
    : [0, 0, { visits: 0, consultations: 0, leads: 0, conversions: 0 }];

  const mainAction = !profile?.isPublic
    ? {
        eyebrow: ready ? "还差最后一步" : "先完成第一张名片",
        title: ready ? "预览并发布名片" : "3 分钟完成经营名片",
        description: ready
          ? "确认访客看到的内容，发布后即可分享。"
          : "介绍自己、选择客户动作、预览发布，只需三步。",
        href: ready ? "/console/card?section=publish" : "/onboarding",
        label: ready ? "去发布名片" : "继续创建名片",
        icon: Radio,
      }
    : newLeads > 0
      ? {
          eyebrow: `${newLeads} 条新线索`,
          title: "先处理正在等你的客户",
          description: "查看客户需求和联系方式，然后标记为跟进中。",
          href: "/console/leads",
          label: "处理新线索",
          icon: Users,
        }
      : totalLeads === 0
        ? {
            eyebrow: "名片已上线",
            title: "把名片发给第一批客户",
            description: "复制公开地址、二维码或系统分享，让访客开始咨询。",
            href: "/console/card?section=publish",
            label: "分享名片",
            icon: Share2,
          }
        : {
            eyebrow: "经营正常",
            title: "看看客户从访问到成交的结果",
            description: "用四个真实经营指标判断下一步该优化哪里。",
            href: "/console/analytics",
            label: "查看经营数据",
            icon: BarChart3,
          };

  const MainIcon = mainAction.icon;
  const metricCards = [
    { label: "访问", value: metrics.visits, icon: Eye },
    { label: "咨询", value: metrics.consultations, icon: MessageCircle },
    { label: "留资", value: metrics.leads, icon: UserPlus },
    { label: "成交", value: metrics.conversions, icon: CheckCircle2 },
  ];

  return (
    <ConsoleShell
      eyebrow="经营概览"
      title={`你好，${profile?.displayName || user.email}`}
      subtitle="这里始终只给你一个当前最重要的动作。"
    >
      {query.welcome === "published" ? (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-[#B7D39B] bg-[#EDF6E5] px-4 py-3 text-sm font-black text-[#3F5F31]">
          <CheckCircle2 className="size-5" />
          名片已真实发布，现在可以发给客户了。
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[24px] border border-[#D7CDBE] bg-[#2B241E] p-5 text-white shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#CFE3B9]">
              {mainAction.eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">{mainAction.title}</h2>
            <p className="mt-2 text-sm leading-6 text-white/75">{mainAction.description}</p>
          </div>
          <Link
            href={mainAction.href}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#6F8F4E] px-5 text-sm font-black text-white transition hover:bg-[#5F7D42]"
          >
            <MainIcon className="size-4" />
            {mainAction.label}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {profile?.isPublic || metrics.visits > 0 || totalLeads > 0 ? (
        <section className="mt-5">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-black text-[#2B241E]">累计经营结果</p>
              <p className="mt-1 text-xs text-[#7A6D5E]">只展示访问、咨询、留资和成交。</p>
            </div>
            <Link href="/console/analytics" className="text-xs font-black text-[#3F5F31] hover:underline">
              查看详情
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {metricCards.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-[20px] border border-[#E8DCCB] bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-[#7A6D5E]">
                  <Icon className="size-4 text-[#6F8F4E]" />
                  {label}
                </div>
                <p className="mt-2 text-2xl font-black text-[#2B241E]">{value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-5 flex flex-wrap items-center gap-2 text-sm">
        <Link href="/console/card" className="ui-button-secondary">
          编辑名片
        </Link>
        {profile?.isPublic ? (
          <Link
            href={`/${profile.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ui-button-secondary"
          >
            打开访客页
          </Link>
        ) : null}
        <Link href="/console/account" className="ui-button-quiet">
          账号与更多设置
        </Link>
      </section>
    </ConsoleShell>
  );
}
