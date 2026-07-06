import WorkbenchShell from "@/components/workbench/WorkbenchShell";
import {
  LineChart,
  Users,
  Package,
  UserPlus,
  BarChart3,
  TrendingUp,
  Globe,
  Smartphone,
  Monitor,
  ArrowDown,
  Calendar,
  RefreshCw,
  AlertTriangle,
  Link2,
  MousePointerClick,
  Target,
} from "lucide-react";
import { getAnalyticsStats, calculateConversionFunnel, getGeoStats } from "@/lib/analytics/stats";

type RangeOption = "today" | "7d" | "30d" | "90d";

async function getEnhancedStats(userId: string, range: RangeOption = "7d") {
  const { db } = await import("@/lib/db");

  const profile = await db.profile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    return null;
  }

  const statsRange = range;

  const [stats, funnel, geo] = await Promise.all([
    getAnalyticsStats({
      profileId: profile.id,
      userId,
      range: statsRange,
    }),
    calculateConversionFunnel({
      profileId: profile.id,
      range: statsRange,
    }),
    getGeoStats({
      profileId: profile.id,
      range: statsRange,
    }),
  ]);

  return { stats, funnel, geo };
}

function formatDayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const labels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return labels[new Date(y, m - 1, d).getDay()];
}

function formatDevice(device: string): string {
  const map: Record<string, string> = {
    mobile: "手机",
    desktop: "电脑",
    tablet: "平板",
    unknown: "未知设备",
  };
  return map[device] ?? device;
}

function formatStatus(status: string): string {
  const map: Record<string, string> = {
    new: "新线索",
    contacted: "待联系",
    following: "跟进中",
    converted: "已成交",
    closed: "已关闭",
  };
  return map[status] ?? status;
}

const RANGE_OPTIONS: Array<{ value: RangeOption; label: string }> = [
  { value: "today", label: "今日" },
  { value: "7d", label: "近 7 天" },
  { value: "30d", label: "近 30 天" },
  { value: "90d", label: "近 90 天" },
];

const channelLabels: Record<string, string> = {
  xiaohongshu: "小红书",
  douyin: "抖音",
  wechat_official: "微信公众号",
  wechat_friend: "微信好友",
  wechat_group: "微信群",
  wechat_moments: "朋友圈",
  search: "搜索引擎",
  direct: "直接访问",
  offline_qr: "线下二维码",
  custom: "自定义渠道",
  other: "其他",
  link: "链接组件",
  qr: "二维码",
  ai_chat: "AI 对话",
  contact_form: "联系表单",
  product_card: "产品咨询",
  unknown: "未知来源",
};

export default async function WorkbenchAnalyticsPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const { getCurrentUserFromCookies } = await import("@/lib/auth");
  const user = await getCurrentUserFromCookies();

  const rangeParam = (searchParams.range as RangeOption) || "7d";
  const currentRange = RANGE_OPTIONS.some((r) => r.value === rangeParam)
    ? rangeParam
    : "7d";

  if (!user) {
    return (
      <WorkbenchShell eyebrow="Analytics" title="数据中心" subtitle="请先登录">
        <p className="text-sm text-[#7A6D5E]">正在跳转登录...</p>
      </WorkbenchShell>
    );
  }

  const data = await getEnhancedStats(user.id, currentRange);

  const stats = data?.stats ?? {
    summary: { totalClicks: 0, uniqueVisitors: 0, totalLeads: 0, totalLinks: 0, productInquiries: 0 },
    devices: [],
    channels: [],
    leadsByStatus: [],
    topLinks: [],
    daily: [],
    hasData: false,
    range: "7d",
  };

  const funnel = data?.funnel ?? { steps: [], overallConversionRate: 0, totalLeads: 0 };
  const geo = data?.geo ?? { countries: [], cities: [] };

  const statCards = [
    {
      label: "总点击",
      value: stats.summary.totalClicks.toLocaleString(),
      icon: MousePointerClick,
      tone: "bg-[#DDE8CD] text-[#3F5F31]",
      sub: `${stats.summary.uniqueVisitors.toLocaleString()} 独立访客`,
    },
    {
      label: "新增线索",
      value: stats.summary.totalLeads.toLocaleString(),
      icon: UserPlus,
      tone: "bg-[#EAF3FF] text-[#2563EB]",
      sub: `${funnel.totalLeads} 条提交`,
    },
    {
      label: "产品咨询",
      value: stats.summary.productInquiries.toLocaleString(),
      icon: Package,
      tone: "bg-[#F6E7C8] text-[#8C612E]",
      sub: "关联产品的线索",
    },
    {
      label: "活跃链接",
      value: stats.summary.totalLinks.toLocaleString(),
      icon: Link2,
      tone: "bg-[#FFE6E2] text-[#B42318]",
      sub: "当前在线",
    },
  ];

  const maxDaily = Math.max(...stats.daily.map((d) => d.clicks), 1);
  const maxDailyLeads = Math.max(...stats.daily.map((d) => d.leads), 1);

  const deviceColor: Record<string, string> = {
    手机: "bg-[#6F8F4E]",
    电脑: "bg-[#2563EB]",
    平板: "bg-[#8C612E]",
    未知设备: "bg-[#B42318]",
  };

  const statusColor: Record<string, string> = {
    新线索: "bg-[#FFE6E2] text-[#B42318]",
    待联系: "bg-[#EAF3FF] text-[#2563EB]",
    跟进中: "bg-[#F6E7C8] text-[#8C612E]",
    已成交: "bg-[#DDE8CD] text-[#3F5F31]",
    已关闭: "bg-[#F7F1E7] text-[#7A6D5E]",
  };

  const maxDevice = Math.max(...stats.devices.map((d) => d.count), 1);

  const rangeLabel = RANGE_OPTIONS.find((r) => r.value === currentRange)?.label ?? "近 7 天";

  return (
    <WorkbenchShell
      eyebrow="Analytics"
      title="数据中心"
      subtitle="查看链接点击、线索转化和产品咨询等核心指标。"
    >
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {RANGE_OPTIONS.map((opt) => {
          const active = currentRange === opt.value;
          return (
            <a
              key={opt.value}
              href={`/workbench/analytics?range=${opt.value}`}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                active
                  ? "bg-[#6F8F4E] text-white"
                  : "bg-[#F7F1E7] text-[#7A6D5E] hover:bg-[#F2E7D8]"
              }`}
            >
              {opt.label}
            </a>
          );
        })}
      </div>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#7A6D5E]">{item.label}</p>
                <span className={`grid size-8 place-items-center rounded-xl ${item.tone}`}>
                  <Icon aria-hidden className="size-4" />
                </span>
              </div>
              <p className="mt-2 text-3xl font-black tracking-tight text-[#2B241E]">
                {item.value}
              </p>
              <p className="mt-2 text-xs font-bold text-[#6F8F4E]">{item.sub}</p>
            </div>
          );
        })}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-black text-[#3F5F31]">{rangeLabel} 访问趋势</p>
              <p className="mt-1 text-xs text-[#7A6D5E]">
                每日链接点击量和新增线索数对比
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="inline-flex items-center gap-1.5 font-bold text-[#7A6D5E]">
                <span className="size-2.5 rounded-full bg-[#6F8F4E]" />
                点击量
              </span>
              <span className="inline-flex items-center gap-1.5 font-bold text-[#7A6D5E]">
                <span className="size-2.5 rounded-full bg-[#2563EB]" />
                线索数
              </span>
            </div>
          </div>
          {stats.hasData ? (
            <div className="mt-5">
              <div className="flex h-48 items-end gap-1.5 sm:gap-2">
                {stats.daily.map((w) => (
                  <div
                    key={w.date}
                    className="flex flex-1 flex-col items-center justify-end gap-2"
                  >
                    <div className="flex w-full items-end justify-center gap-0.5 h-full">
                      <div
                        className="w-2 sm:w-3 rounded-t-lg bg-gradient-to-t from-[#6F8F4E] to-[#A8C98B]"
                        style={{ height: `${Math.max((w.clicks / maxDaily) * 100, 3)}%` }}
                        title={`点击: ${w.clicks}`}
                      />
                      <div
                        className="w-2 sm:w-3 rounded-t-lg bg-gradient-to-t from-[#2563EB] to-[#7BA3F8]"
                        style={{ height: `${Math.max((w.leads / maxDailyLeads) * 100, 3)}%` }}
                        title={`线索: ${w.leads}`}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-[#7A6D5E]">
                      {formatDayLabel(w.date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-8 flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 aria-hidden className="size-12 text-[#E8DCCB]" />
              <p className="mt-3 text-sm font-bold text-[#7A6D5E]">当前时间段暂无数据</p>
              <p className="mt-1 text-xs text-[#B8ADA3]">
                分享你的公开主页链接，被点击后数据将在这里显示。
              </p>
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-black text-[#3F5F31]">线索状态分布</p>
          <p className="mt-1 text-xs text-[#7A6D5E]">{rangeLabel} 不同阶段的客户线索数量。</p>
          {stats.summary.totalLeads > 0 ? (
            <ul className="mt-4 grid gap-3 text-sm">
              {stats.leadsByStatus.map((item) => (
                <li key={item.status} className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusColor[formatStatus(item.status)] ?? "bg-[#F7F1E7] text-[#7A6D5E]"}`}>
                      {formatStatus(item.status)}
                    </span>
                    <span className="text-xs font-black text-[#7A6D5E]">{item.count} 条</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#F7F1E7]">
                    <div
                      className="h-full bg-[#6F8F4E]"
                      style={{ width: `${(item.count / stats.summary.totalLeads) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 flex flex-col items-center justify-center py-8 text-center">
              <UserPlus aria-hidden className="size-10 text-[#E8DCCB]" />
              <p className="mt-3 text-sm font-bold text-[#7A6D5E]">当前时间段暂无数据</p>
              <p className="mt-1 text-xs text-[#B8ADA3]">
                访客通过公开主页联系你后，将形成线索。
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-black text-[#3F5F31]">热门链接</p>
          <p className="mt-1 text-xs text-[#7A6D5E]">{rangeLabel} 点击量最高的链接。</p>
          {stats.topLinks.length > 0 ? (
            <ul className="mt-4 grid gap-2 text-sm">
              {stats.topLinks.slice(0, 5).map((link, i) => (
                <li
                  key={link.id}
                  className="flex items-center justify-between rounded-2xl bg-[#F7F1E7] px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid size-7 shrink-0 place-items-center rounded-xl bg-white text-xs font-black text-[#7A6D5E] ring-1 ring-[#E8DCCB]">
                      {i + 1}
                    </span>
                    <span className="truncate font-bold text-[#2B241E]">{link.title || "未命名链接"}</span>
                  </div>
                  <span className="shrink-0 text-xs font-black text-[#6F8F4E]">
                    {link.clicks.toLocaleString()} 次
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 flex flex-col items-center justify-center py-8 text-center">
              <Link2 aria-hidden className="size-10 text-[#E8DCCB]" />
              <p className="mt-3 text-sm font-bold text-[#7A6D5E]">当前时间段暂无数据</p>
              <p className="mt-1 text-xs text-[#B8ADA3]">
                添加链接到你的主页，分享后即可统计点击数据。
              </p>
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-black text-[#3F5F31]">设备分布</p>
          <p className="mt-1 text-xs text-[#7A6D5E]">{rangeLabel} 访客使用的设备类型。</p>
          {stats.devices.length > 0 ? (
            <ul className="mt-4 grid gap-3 text-sm">
              {stats.devices.map((item) => (
                <li key={item.device} className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#2B241E] inline-flex items-center gap-2">
                      {formatDevice(item.device) === "手机" && <Smartphone aria-hidden className="size-4 text-[#7A6D5E]" />}
                      {formatDevice(item.device) === "电脑" && <Monitor aria-hidden className="size-4 text-[#7A6D5E]" />}
                      {formatDevice(item.device) !== "手机" && formatDevice(item.device) !== "电脑" && <Globe aria-hidden className="size-4 text-[#7A6D5E]" />}
                      {formatDevice(item.device)}
                    </span>
                    <span className="text-xs font-black text-[#7A6D5E]">
                      {item.count.toLocaleString()} 次
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#F7F1E7]">
                    <div
                      className={`h-full ${deviceColor[formatDevice(item.device)] ?? "bg-[#6F8F4E]"}`}
                      style={{ width: `${(item.count / maxDevice) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 flex flex-col items-center justify-center py-8 text-center">
              <Smartphone aria-hidden className="size-10 text-[#E8DCCB]" />
              <p className="mt-3 text-sm font-bold text-[#7A6D5E]">当前时间段暂无数据</p>
              <p className="mt-1 text-xs text-[#B8ADA3]">
                访客访问后将显示设备分布数据。
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-black text-[#3F5F31]">来源渠道</p>
          <p className="mt-1 text-xs text-[#7A6D5E]">{rangeLabel} 访客来源渠道分布。</p>
          {stats.channels.length > 0 ? (
            <ul className="mt-4 grid gap-3 text-sm">
              {stats.channels.slice(0, 6).map((item) => {
                const maxChannel = Math.max(...stats.channels.map((c) => c.count), 1);
                return (
                  <li key={item.channel} className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#2B241E]">
                        {channelLabels[item.channel] || item.channel}
                      </span>
                      <span className="text-xs font-black text-[#7A6D5E]">
                        {item.count.toLocaleString()} 次
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#F7F1E7]">
                      <div
                        className="h-full bg-[#6F8F4E]"
                        style={{ width: `${(item.count / maxChannel) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-6 flex flex-col items-center justify-center py-8 text-center">
              <Target aria-hidden className="size-10 text-[#E8DCCB]" />
              <p className="mt-3 text-sm font-bold text-[#7A6D5E]">当前时间段暂无数据</p>
              <p className="mt-1 text-xs text-[#B8ADA3]">
                从不同渠道分享你的主页，即可查看来源分布。
              </p>
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-black text-[#3F5F31]">转化漏斗</p>
          <p className="mt-1 text-xs text-[#7A6D5E]">{rangeLabel} 从访问到成交的转化路径。</p>
          {funnel.steps.length > 0 && funnel.steps[0].count > 0 ? (
            <div className="mt-4 space-y-3">
              {funnel.steps.slice(0, 5).map((step, idx) => (
                <div key={step.name} className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <span className="size-6 rounded-full bg-[#6F8F4E] text-xs font-black text-white flex items-center justify-center">
                      {idx + 1}
                    </span>
                    {idx < funnel.steps.length - 1 && idx < 4 && (
                      <ArrowDown aria-hidden className="size-4 text-[#D8CCBB]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#2B241E]">{step.name}</span>
                      <span className="text-xs font-black text-[#7A6D5E]">
                        {step.count.toLocaleString()}
                        {idx > 0 && (
                          <span className="ml-1 text-[#6F8F4E]">
                            ({step.conversionRate.toFixed(1)}%)
                          </span>
                        )}
                      </span>
                    </div>
                    {idx < funnel.steps.length - 1 && idx < 4 && (
                      <div className="h-2 mt-1 overflow-hidden rounded-full bg-[#F7F1E7]">
                        <div
                          className="h-full bg-[#6F8F4E]"
                          style={{ width: `${Math.max(step.conversionRate, 5)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center justify-center py-8 text-center">
              <TrendingUp aria-hidden className="size-10 text-[#E8DCCB]" />
              <p className="mt-3 text-sm font-bold text-[#7A6D5E]">当前时间段暂无数据</p>
              <p className="mt-1 text-xs text-[#B8ADA3]">
                有访问和线索数据后，将显示转化漏斗。
              </p>
            </div>
          )}
        </div>
      </section>

      {geo.cities.length > 0 && (
        <section className="mt-6 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-black text-[#3F5F31]">访客地区分布</p>
          <p className="mt-1 text-xs text-[#7A6D5E]">{rangeLabel} 访问量最高的城市。</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {geo.cities.slice(0, 6).map((item, idx) => (
              <div
                key={item.city}
                className="flex items-center justify-between rounded-2xl bg-[#F7F1E7] px-4 py-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-white text-[11px] font-black text-[#7A6D5E] ring-1 ring-[#E8DCCB]">
                    {idx + 1}
                  </span>
                  <span className="truncate text-sm font-bold text-[#2B241E]">{item.city || "未知"}</span>
                </div>
                <span className="shrink-0 text-xs font-black text-[#6F8F4E]">
                  {item.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {!stats.hasData && (
        <section className="mt-6 rounded-[28px] border border-[#E8DCCB] bg-[#F7F1E7] p-5 sm:p-6">
          <p className="text-sm font-black text-[#3F5F31]">如何获取更多数据</p>
          <ul className="mt-3 grid gap-2 text-xs text-[#7A6D5E]">
            <li>• 分享你的公开主页链接给朋友</li>
            <li>• 将二维码印在名片、海报或产品上</li>
            <li>• 在社交媒体、微信、朋友圈分享你的主页链接</li>
            <li>• 创建带渠道标签的短链接，追踪不同推广效果</li>
            <li>• 访客点击链接或提交咨询后，数据会自动更新</li>
          </ul>
        </section>
      )}
    </WorkbenchShell>
  );
}
