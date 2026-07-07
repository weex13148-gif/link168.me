import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Calculator,
  Scale,
  BarChart3,
  Palette,
  Megaphone,
  TrendingUp,
  Sparkles,
  ArrowLeft,
  Crown,
  AlertTriangle,
} from "lucide-react";
import WorkbenchShell from "@/components/workbench/WorkbenchShell";
import AiChatClient from "@/components/ai/AiChatClient";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { getConfig, isAssistantEnabled } from "@/lib/app-config";
import { getAiQuota } from "@/lib/ai/permissions";
import { AI_ASSISTANT_LIST, normalizeAssistantTitle, getAssistantDefinition } from "@/lib/ai/assistants";
import { getProviderConfig, isProviderConfigured } from "@/lib/ai/provider";
import { listConversations } from "@/lib/ai/conversations";

export const runtime = "nodejs";

const ASSISTANT_ICONS: Record<string, typeof Calculator> = {
  财税助理: Calculator,
  法务助理: Scale,
  市场调研助理: BarChart3,
  设计助理: Palette,
  社媒运营助理: Megaphone,
  销售顾问助理: TrendingUp,
};

const ASSISTANT_COLORS: Record<string, string> = {
  财税助理: "bg-[var(--ui-brand-soft)] text-[var(--ui-brand)]",
  法务助理: "bg-[var(--ui-info-soft)] text-[var(--ui-info)]",
  市场调研助理: "bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]",
  设计助理: "bg-[var(--ui-danger-soft)] text-[var(--ui-danger)]",
  社媒运营助理: "bg-[#E8E6FF] text-[#5B6FFF]",
  销售顾问助理: "bg-[#D1FADF] text-[#0A8E4A]",
};

const ASSISTANT_BG_COLORS: Record<string, string> = {
  财税助理: "bg-[var(--ui-success)]",
  法务助理: "bg-[var(--ui-info)]",
  市场调研助理: "bg-[var(--ui-warning)]",
  设计助理: "bg-[var(--ui-danger)]",
  社媒运营助理: "bg-[#5B6FFF]",
  销售顾问助理: "bg-[#0A8E4A]",
};

const ASSISTANT_USE_CASES: Record<string, string[]> = {
  财税助理: [
    "季度末不知道该准备哪些纳税申报材料",
    "进货没有发票，成本怎么合规归类",
    "想了解小规模纳税人和一般纳税人区别",
    "个体户营业额超过免征额要怎么交税",
    "公司利润薄，想合规地优化税负",
  ],
  法务助理: [
    "签服务合同前想快速过一遍风险条款",
    "员工入职/离职要签哪些协议才合规",
    "保密协议和竞业限制有什么区别",
    "用户注册协议和隐私政策怎么写才合规",
    "合作方违约了，怎么保留证据",
  ],
  市场调研助理: [
    "准备开一家咖啡店，不知道目标用户是谁",
    "新产品上市不知道怎么定价",
    "想了解竞争对手的产品和定价策略",
    "线下门店怎么推广获客最有效",
    "做什么促销活动效果最好",
  ],
  设计助理: [
    "个人品牌用什么主色调更有辨识度",
    "小红书封面图怎么设计更吸引点击",
    "海报排版有哪些基本技巧",
    "想设计一个 Logo，有什么要注意的",
    "社媒发布图片的比例和尺寸规范",
  ],
  社媒运营助理: [
    "小红书笔记怎么写才有流量",
    "抖音新手前几条视频发什么内容",
    "公众号怎么涨粉",
    "朋友圈发什么内容更容易成交",
    "短视频脚本怎么写才有钩子",
  ],
  销售顾问助理: [
    "客户说太贵了，怎么回应才能推进成交",
    "新品上市怎么设计首发话术和跟进节奏",
    "客户犹豫不决，用什么话术临门一脚",
    "老客户怎么开口请他帮忙转介绍",
    "客户需求不明确，怎么提问挖出真实痛点",
  ],
};

type PageProps = {
  params: Promise<{ assistant: string }>;
};

export default async function WorkbenchAiAssistantPage({ params }: PageProps) {
  const { assistant: assistantParam } = await params;
  const user = await getCurrentUserFromCookies();
  if (!user) redirect("/login");

  const normalized = normalizeAssistantTitle(assistantParam);
  if (!normalized) {
    redirect("/workbench/ai");
  }

  const assistantDef = getAssistantDefinition(normalized);
  if (!assistantDef) {
    redirect("/workbench/ai");
  }

  const config = await getConfig();
  const quota = await getAiQuota(user.id);
  const providerConfig = await getProviderConfig(assistantDef);
  const isConfigured = isProviderConfigured(providerConfig) && config.aiEnabled;
  const assistantEnabled = isAssistantEnabled(config, assistantDef.displayTitle);

  // 获取历史会话列表
  const conversations = await listConversations(user.id, normalized);

  const Icon = ASSISTANT_ICONS[normalized] || Sparkles;
  const colorClass = ASSISTANT_COLORS[normalized] || ASSISTANT_COLORS["财税助理"];
  const bgColorClass = ASSISTANT_BG_COLORS[normalized] || ASSISTANT_BG_COLORS["财税助理"];
  const useCases = ASSISTANT_USE_CASES[normalized] || [];

  let accessLevel: "none" | "preview" | "full" = "preview";
  let accessReason = "";

  if (!isConfigured || !assistantEnabled) {
    accessLevel = "none";
    accessReason = !isConfigured
      ? "AI 服务尚未配置，请联系管理员在配置中心启用 AI 服务并填写 API 密钥。"
      : "该 AI 助手尚未启用，请联系管理员。";
  } else if (quota.planCode === "free") {
    accessLevel = "preview";
    accessReason = "免费用户仅可预览 AI 助手介绍，升级会员即可正式使用。";
  } else if (!quota.isActiveMember) {
    accessLevel = "preview";
    accessReason = "会员已过期，请续费后继续使用 AI 助手。";
  } else if (!quota.canCall) {
    accessLevel = "preview";
    accessReason = quota.reason || "额度已用完，请升级套餐或购买额度包。";
  } else {
    accessLevel = "full";
  }

  return (
    <WorkbenchShell
      eyebrow={`AI Assistant · ${assistantDef.category}`}
      title={assistantDef.displayTitle}
      subtitle={assistantDef.role}
    >
      <div className="mb-4">
        <Link
          href="/workbench/ai"
          className="inline-flex items-center gap-1 text-xs font-bold text-[var(--ui-muted)] transition hover:text-[var(--ui-ink)]"
        >
          <ArrowLeft className="size-3.5" />
          返回 AI 助手列表
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div>
          <AiChatClient
            assistant={normalized}
            assistantTitle={assistantDef.displayTitle}
            assistantColor={bgColorClass}
            accessLevel={accessLevel}
            accessReason={accessReason}
            initialConversations={conversations}
            quota={quota}
          />
        </div>

        <aside className="grid gap-4">
          <div className="rounded-[28px] border border-[var(--ui-line)] bg-[var(--ui-surface-strong)] p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className={`grid size-9 place-items-center rounded-xl ${colorClass}`}>
                <Icon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-black text-[var(--ui-ink)]">{assistantDef.displayTitle}</p>
                <p className="text-[10px] text-[var(--ui-muted)]">{assistantDef.category}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[var(--ui-line)]">
              <p className="text-xs font-black text-[var(--ui-brand)]">核心能力</p>
              <ul className="mt-2 grid gap-1.5">
                {assistantDef.capabilities.map((cap) => (
                  <li key={cap} className="flex items-start gap-2 text-xs text-[var(--ui-ink)]">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--ui-success)]" />
                    <span>{cap}</span>
                  </li>
                ))}
              </ul>
            </div>

            {useCases.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--ui-line)]">
                <p className="text-xs font-black text-[var(--ui-brand)]">适用场景</p>
                <ul className="mt-2 grid gap-1.5">
                  {useCases.slice(0, 3).map((uc, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-[var(--ui-muted)]">
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--ui-warning)]" />
                      <span>{uc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-[var(--ui-line)] bg-[var(--ui-surface-strong)] p-5 shadow-sm">
            <p className="text-xs font-black text-[var(--ui-brand)]">套餐月度额度</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-[var(--ui-ink)]">
              {quota.planUsage.limit === -1 ? "∞" : quota.planUsage.used.toLocaleString()}
              <span className="text-sm text-[var(--ui-muted)]">
                {" "}
                / {quota.planUsage.limit === -1 ? "无限" : quota.planUsage.limit.toLocaleString()}
              </span>
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--ui-page)]">
              <div
                className="h-full rounded-full bg-[var(--ui-success)]"
                style={{ width: `${quota.planUsage.percent ?? 0}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] text-[var(--ui-muted)]">
              {quota.planUsage.limit === -1
                ? "企业版无限额度"
                : quota.planUsage.limit === 0
                ? "免费用户无正式额度"
                : `剩余 ${quota.planUsage.remaining.toLocaleString()} 次`}
            </p>
            <p className="mt-1 text-[10px] text-[var(--ui-muted)]">
              今日已用 {quota.dailyUsage.used}/{quota.dailyUsage.limit === -1 ? "∞" : quota.dailyUsage.limit} 次
            </p>
            <Link
              href="/workbench/membership"
              className="mt-3 inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-full bg-[var(--ui-page)] px-3 text-[10px] font-black text-[var(--ui-accent)] hover:bg-[var(--ui-line)]"
            >
              <Crown className="size-3" />
              升级套餐
            </Link>
          </div>

          {quota.planCode === "free" && (
            <div className="rounded-[28px] border border-[var(--ui-warning-soft)] bg-[var(--ui-surface)] p-4">
              <div className="flex items-start gap-2">
                <Crown className="mt-0.5 size-4 shrink-0 text-[var(--ui-accent)]" />
                <div>
                  <p className="text-xs font-black text-[var(--ui-accent)]">升级会员解锁 AI</p>
                  <p className="mt-1 text-[10px] text-[var(--ui-muted)]">
                    免费用户仅可预览 AI 助手介绍，升级会员基础版、Plus 或企业版即可正式使用六大 AI 助手。
                  </p>
                  <Link
                    href="/workbench/membership"
                    className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-full bg-[var(--ui-warning)] px-3 text-[10px] font-black text-white hover:bg-[var(--ui-warning)]"
                  >
                    <Crown className="size-3" />
                    立即升级
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-[28px] border border-[var(--ui-danger-soft)] bg-[var(--ui-danger-soft)] p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--ui-danger)]" />
              <div>
                <p className="text-xs font-black text-[var(--ui-danger)]">免责声明</p>
                <p className="mt-1 text-[10px] text-[var(--ui-muted)]">
                  {assistantDef.disclaimer}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </WorkbenchShell>
  );
}
