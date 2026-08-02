import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Eye, MessageCircle, UserPlus } from "lucide-react";
import WorkbenchShell from "@/components/workbench/WorkbenchShell";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { getCoreMvpMetrics } from "@/lib/analytics";
import { db } from "@/lib/db";

type RangeKey = "7d" | "30d" | "90d" | "all";

function rangeStart(range: RangeKey, profileCreatedAt: Date) {
  if (range === "all") return profileCreatedAt;
  const days = Number.parseInt(range, 10);
  return new Date(Date.now() - days * 24 * 60 * 60 * 1_000);
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect("/login");

  const profile = await db.profile.findUnique({
    where: { userId: user.id },
    select: { id: true, createdAt: true, isPublic: true },
  });
  if (!profile) redirect("/onboarding");

  const query = await searchParams;
  const range: RangeKey = ["7d", "30d", "90d", "all"].includes(query.range || "")
    ? (query.range as RangeKey)
    : "30d";
  const metrics = await getCoreMvpMetrics(profile.id, {
    from: rangeStart(range, profile.createdAt),
    to: new Date(Date.now() + 1_000),
  });

  const cards = [
    { label: "访问", value: metrics.visits, description: "真实访客打开公开页", icon: Eye },
    { label: "咨询", value: metrics.consultations, description: "发起咨询或点击联系方式", icon: MessageCircle },
    { label: "留资", value: metrics.leads, description: "提交需求并形成客户线索", icon: UserPlus },
    { label: "成交", value: metrics.conversions, description: "被你标记为成交的线索", icon: CheckCircle2 },
  ];
  const rangeOptions: Array<{ value: RangeKey; label: string }> = [
    { value: "7d", label: "近 7 天" },
    { value: "30d", label: "近 30 天" },
    { value: "90d", label: "近 90 天" },
    { value: "all", label: "全部" },
  ];

  return (
    <WorkbenchShell
      eyebrow="经营数据"
      title="从访问到成交"
      subtitle="只保留能回答“客户从哪里来、有没有转化”的四项指标。"
    >
      <div className="flex flex-wrap gap-2">
        {rangeOptions.map((option) => (
          <Link
            key={option.value}
            href={`/console/analytics?range=${option.value}`}
            className={`inline-flex min-h-10 items-center rounded-xl px-4 text-xs font-black ${
              range === option.value
                ? "bg-[#2B241E] text-white"
                : "border border-[#E8DCCB] bg-white text-[#3F5F31]"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </div>

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, description, icon: Icon }) => (
          <article key={label} className="rounded-[20px] border border-[#E8DCCB] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-2 text-xs font-black text-[#3F5F31]">
              <Icon className="size-4" />
              {label}
            </div>
            <p className="mt-3 text-3xl font-black text-[#2B241E]">{value.toLocaleString()}</p>
            <p className="mt-2 text-xs leading-5 text-[#7A6D5E]">{description}</p>
          </article>
        ))}
      </section>

      <section className="mt-5 rounded-[20px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
        <h2 className="text-base font-black text-[#2B241E]">经营漏斗</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {cards.map((card, index) => {
            const previous = index === 0 ? null : cards[index - 1].value;
            const rate =
              previous && previous > 0
                ? Math.min(100, Math.round((card.value / previous) * 100))
                : null;
            return (
              <div key={card.label} className="rounded-2xl bg-[#F7F1E7] px-4 py-3">
                <p className="text-xs font-bold text-[#7A6D5E]">{card.label}</p>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <p className="text-xl font-black text-[#2B241E]">{card.value}</p>
                  {rate !== null ? (
                    <span className="text-xs font-black text-[#6F8F4E]">{rate}%</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        {!profile.isPublic && metrics.visits === 0 ? (
          <p className="mt-4 text-sm text-[#7A6D5E]">
            名片尚未公开。先去
            <Link href="/console/card?section=publish" className="mx-1 font-black text-[#3F5F31] hover:underline">
              预览与发布
            </Link>
            ，再开始积累真实数据。
          </p>
        ) : null}
      </section>
    </WorkbenchShell>
  );
}
