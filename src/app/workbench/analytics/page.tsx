import WorkbenchShell from "@/components/workbench/WorkbenchShell";
import { LineChart, Users, Package, UserPlus, BarChart3, TrendingUp, Globe, Smartphone, Monitor, ArrowDown } from "lucide-react";
import { getAnalyticsStats, calculateConversionFunnel, getGeoStats } from "@/lib/analytics/stats";

async function getEnhancedStats(userId: string, range: "7d" | "30d" | "90d" = "7d") {
  const { db } = await import("@/lib/db");

  const profile = await db.profile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    return null;
  }

  // 并行获取所有数据
  const [stats, funnel, geo] = await Promise.all([
    getAnalyticsStats({
      profileId: profile.id,
      userId,
      range,
    }),
    calculateConversionFunnel({
      profileId: profile.id,
      range,
    }),
    getGeoStats({
      profileId: profile.id,
      range,
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
    contacted: "已联系",
    closed: "已关闭",
    converted: "已转化",
  };
  return map[status] ?? status;
}

export default async function WorkbenchAnalyticsPage() {
  const { getCurrentUserFromCookies } = await import("@/lib/auth");
  const user = await getCurrentUserFromCookies();
  if (!user) {
    return (
      <WorkbenchShell eyebrow="Analytics" title="数据中心" subtitle="请先登录">
        <p className="text-sm text-[#7A6D5E]">正在跳转登录...</p>
      </WorkbenchShell>
    );
  }

  // 默认显示 7 日数据
  const data = await getEnhancedStats(user.id, "7d");

  // 兼容旧结构：如果新数据获取失败，使用默认值
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
      icon: Users,
      tone: "bg-[#DDE8CD] text-[#3F5F31]",
      sub: `${stats.summary.uniqueVisitors} 独立访客`,
    },
    {
      label: "线索总数",
      value: stats.summary.totalLeads.toLocaleString(),
      icon: LineChart,
      tone: "bg-[#EAF3FF] text-[#2563EB]",
      sub: `${funnel.totalLeads} 条新线索`,
    },
    {
      label: "产品咨询",
      value: stats.summary.productInquiries.toLocaleString(),
      icon: Package,
      tone: "bg-[#F6E7C8] text-[#8C612E]",
      sub: "近7日",
    },
    {
      label: "活跃链接",
      value: stats.summary.totalLinks.toLocaleString(),
      icon: BarChart3,
      tone: "bg-[#FFE6E2] text-[#B42318]",
      sub: "当前在线",
    },
  ];

  const maxDaily = Math.max(...stats.daily.map((d) => d.clicks), 1);

  const deviceColor: Record<string, string> = {
    手机: "bg-[#6F8F4E]",
    电脑: "bg-[#2563EB]",
    平板: "bg-[#8C612E]",
    unknown: "bg-[#B42318]",
  };

  const statusColor: Record<string, string> = {
    新线索: "bg-[#DDE8CD] text-[#3F5F31]",
    已联系: "bg-[#EAF3FF] text-[#2563EB]",
    已转化: "bg-[#6F8F4E] text-white",
    已关闭: "bg-[#FFE6E2] text-[#B42318]",
  };

  const maxDevice = Math.max(...stats.devices.map((d) => d.count), 1);

  // 渠道标签映射
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
  };

  return (
    <WorkbenchShell
      eyebrow="Analytics"
      title="数据中心"
      subtitle="查看链接点击、线索转化和产品咨询等核心指标。"
    >
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
          <p className="text-sm font-black text-[#3F5F31]">近 7 天链接点击</p>
          <p className="mt-1 text-xs text-[#7A6D5E]">
            统计通过二维码、分享链接直接点击的次数。
          </p>
          {stats.hasData ? (
            <div className="mt-5 flex h-48 items-end gap-2">
              {stats.daily.map((w) => (
                <div
                  key={w.date}
                  className="flex flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="text-xs font-black text-[#2B241E]">{w.clicks}</span>
                  <div
                    className="w-full min-w-[24px] rounded-t-2xl bg-gradient-to-b from-[#6F8F4E] to-[#DDE8CD]"
                    style={{ height: `${Math.max((w.clicks / maxDaily) * 100, 4)}%` }}
                  />
                  <span className="text-xs font-bold text-[#7A6D5E]">
                    {formatDayLabel(w.date)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-8 flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 aria-hidden className="size-12 text-[#E8DCCB]" />
              <p className="mt-3 text-sm font-bold text-[#7A6D5E]">暂无真实数据</p>
              <p className="mt-1 text-xs text-[#B8ADA3]">
                分享你的公开主页链接，被点击后数据将在这里显示。
              </p>
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-black text-[#3F5F31]">线索状态分布</p>
          <p className="mt-1 text-xs text-[#7A6D5E]">不同阶段的客户线索数量。</p>
          {stats.summary.totalLeads > 0 ? (
            <ul className="mt-4 grid gap-3 text-sm">
              {stats.leadsByStatus.map((item) => (
                <li key={item.status} className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusColor[formatStatus(item.status)] ?? "bg-[#F7F1E7] text-[#7A6D5E]"}`}>
                      {formatStatus(item.status)}
                    </span>
                    <span className="text-xs font-black text-[#7A6D5E]">{item.count} 条</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 flex flex-col items-center justify-center py-8 text-center">
              <UserPlus aria-hidden className="size-10 text-[#E8DCCB]" />
              <p className="mt-3 text-sm font-bold text-[#7A6D5E]">暂无真实数据</p>
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
          <p className="mt-1 text-xs text-[#7A6D5E]">点击量最高的链接。</p>
          {stats.topLinks.length > 0 ? (
            <ul className="mt-4 grid gap-2 text-sm">
              {stats.topLinks.map((link, i) => (
                <li
                  key={link.id}
                  className="flex items-center justify-between rounded-2xl bg-[#F7F1E7] px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid size-7 shrink-0 place-items-center rounded-xl bg-white text-xs font-black text-[#7A6D5E] ring-1 ring-[#E8DCCB]">
                      {i + 1}
                    </span>
                    <span className="truncate font-bold text-[#2B241E]">{link.title}</span>
                  </div>
                  <span className="shrink-0 text-xs font-black text-[#6F8F4E]">
                    {link.clicks} 次
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-center text-xs text-[#B8ADA3]">
              暂无点击数据，分享你的主页开始积累。
            </p>
          )}
        </div>

        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-black text-[#3F5F31]">设备分布</p>
          <p className="mt-1 text-xs text-[#7A6D5E]">访客使用的设备类型。</p>
          {stats.devices.length > 0 ? (
            <ul className="mt-4 grid gap-3 text-sm">
              {stats.devices.map((item) => (
                <li key={item.device} className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#2B241E]">{formatDevice(item.device)}</span>
                    <span className="text-xs font-black text-[#7A6D5E]">
                      {item.count} 次 · {Math.round((item.count / maxDevice) * 100)}%
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
            <p className="mt-4 text-center text-xs text-[#B8ADA3]">
              暂无设备数据。
            </p>
          )}
        </div>
      </section>

      {/* 来源渠道分布 */}
      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-black text-[#3F5F31]">来源渠道</p>
          <p className="mt-1 text-xs text-[#7A6D5E]">访客来源渠道分布。</p>
          {stats.channels.length > 0 ? (
            <ul className="mt-4 grid gap-3 text-sm">
              {stats.channels.slice(0, 5).map((item) => (
                <li key={item.channel} className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#2B241E]">
                      {channelLabels[item.channel] || item.channel}
                    </span>
                    <span className="text-xs font-black text-[#7A6D5E]">
                      {item.count} 次
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-center text-xs text-[#B8ADA3]">
              暂无渠道数据。
            </p>
          )}
        </div>

        {/* 转化漏斗 */}
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-black text-[#3F5F31]">转化漏斗</p>
          <p className="mt-1 text-xs text-[#7A6D5E]">从访问到成交的转化路径。</p>
          {funnel.steps.length > 0 && funnel.steps[0].count > 0 ? (
            <div className="mt-4 space-y-2">
              {funnel.steps.slice(0, 4).map((step, idx) => (
                <div key={step.name} className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <span className="size-6 rounded-full bg-[#6F8F4E] text-xs font-black text-white flex items-center justify-center">
                      {idx + 1}
                    </span>
                    {idx < funnel.steps.length - 1 && (
                      <ArrowDown aria-hidden className="size-4 text-[#D8CCBB]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#2B241E]">{step.name}</span>
                      <span className="text-xs font-black text-[#7A6D5E]">
                        {step.count} ({step.conversionRate.toFixed(1)}%)
                      </span>
                    </div>
                    {idx < funnel.steps.length - 1 && (
                      <div className="h-2 mt-1 overflow-hidden rounded-full bg-[#F7F1E7]">
                        <div
                          className="h-full bg-[#6F8F4E]"
                          style={{ width: `${step.conversionRate}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-center text-xs text-[#B8ADA3]">
              暂无漏斗数据。
            </p>
          )}
        </div>
      </section>

      {!stats.hasData && (
        <section className="mt-6 rounded-[28px] border border-[#E8DCCB] bg-[#F7F1E7] p-5 sm:p-6">
          <p className="text-sm font-black text-[#3F5F31]">如何获取更多数据</p>
          <ul className="mt-3 grid gap-2 text-xs text-[#7A6D5E]">
            <li>• 分享你的公开主页链接给朋友</li>
            <li>• 将二维码印在名片、海报或产品上</li>
            <li>• 在社交媒体、微信、朋友圈分享你的主页链接</li>
            <li>• 访客点击链接或提交咨询后，数据会自动更新</li>
          </ul>
        </section>
      )}
    </WorkbenchShell>
  );
}
