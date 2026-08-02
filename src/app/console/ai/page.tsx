import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Calculator,
  Scale,
  BarChart3,
  Palette,
  Megaphone,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Crown,
  AlertTriangle,
  BookOpen,
  Bot,
  UserPlus,
} from "lucide-react";
import WorkbenchShell from "@/components/workbench/WorkbenchShell";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { getConfig, isAssistantEnabled } from "@/lib/app-config";
import { getAiQuota } from "@/lib/ai/permissions";
import { AI_ASSISTANT_LIST } from "@/lib/ai/assistants";
import { getProviderConfig, isProviderConfigured } from "@/lib/ai/provider";

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
  财税助理: "bg-[#DDE8CD] text-[#3F5F31]",
  法务助理: "bg-[#EAF3FF] text-[#2563EB]",
  市场调研助理: "bg-[#F6E7C8] text-[#8C612E]",
  设计助理: "bg-[#FFE6E2] text-[#B42318]",
  社媒运营助理: "bg-[#E8E6FF] text-[#5B6FFF]",
  销售顾问助理: "bg-[#D1FADF] text-[#0A8E4A]",
};

const ASSISTANT_GRADIENTS: Record<string, string> = {
  财税助理: "from-[#DDE8CD] to-[#B8D0A0]",
  法务助理: "from-[#EAF3FF] to-[#BFDBFE]",
  市场调研助理: "from-[#F6E7C8] to-[#E8D096]",
  设计助理: "from-[#FFE6E2] to-[#FECACA]",
  社媒运营助理: "from-[#E8E6FF] to-[#C7D2FE]",
  销售顾问助理: "from-[#D1FADF] to-[#7BE3A4]",
};

export default async function ConsoleAiPage() {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect("/login");

  const config = await getConfig();
  const quota = await getAiQuota(user.id);
  const firstAssistant = AI_ASSISTANT_LIST[0];
  const providerConfig = await getProviderConfig(firstAssistant);
  const isConfigured = isProviderConfigured(providerConfig) && config.aiEnabled;

  const assistants = AI_ASSISTANT_LIST
    .filter((assistant) => ASSISTANT_ICONS[assistant.title])
    .map((assistant) => {
      const displayTitle = assistant.displayTitle;
      const enabled = isAssistantEnabled(config, displayTitle);
      const Icon = ASSISTANT_ICONS[assistant.title] || Sparkles;
      const colorClass = ASSISTANT_COLORS[assistant.title] || ASSISTANT_COLORS["财税助理"];
      const gradientClass = ASSISTANT_GRADIENTS[assistant.title] || ASSISTANT_GRADIENTS["财税助理"];

      return {
        key: assistant.title,
        title: assistant.title,
        displayTitle: assistant.displayTitle,
        category: assistant.category,
        role: assistant.role,
        capabilities: assistant.capabilities,
        riskNotice: assistant.riskNotice,
        enabled,
        Icon,
        colorClass,
        gradientClass,
      };
    });

  const showUpgrade = !quota.isActiveMember || quota.planCode === "free";

  return (
    <WorkbenchShell
      eyebrow="AI Assistants"
      title="AI 助手中心"
      subtitle="六大专业 AI 助手，帮你搞定财税、法务、市场调研、品牌设计、社媒运营和销售转化。"
    >
      {!isConfigured && (
        <div className="mb-6 flex items-start gap-3 rounded-[28px] border border-[#FFE6E2] bg-[#FFF5F3] p-5">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#B42318]" />
          <div>
            <p className="text-sm font-black text-[#B42318]">AI 服务尚未配置</p>
            <p className="mt-1 text-xs text-[#7A6D5E]">
              管理员尚未在配置中心启用 AI 服务或填写 API 密钥，请联系超级管理员完成配置后再试。
            </p>
          </div>
        </div>
      )}

      {quota.planCode === "free" && (
        <div className="mb-6 flex items-start gap-3 rounded-[28px] border border-[#F6E7C8] bg-[#FFFDF8] p-5">
          <Crown className="mt-0.5 size-5 shrink-0 text-[#8C612E]" />
          <div>
            <p className="text-sm font-black text-[#8C612E]">免费用户仅可预览 AI 助手介绍</p>
            <p className="mt-1 text-xs text-[#7A6D5E]">
              升级会员基础版、Plus 或企业版即可正式使用六大 AI 助手。免费用户无正式调用额度。
            </p>
            <Link
              href="/console/membership"
              className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full bg-[#8C612E] px-4 text-xs font-black text-white hover:bg-[#6F4F24]"
            >
              <Crown className="size-3.5" />
              升级会员解锁 AI
            </Link>
          </div>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assistants.map((item) => {
          const Icon = item.Icon;
          const isDisabled = !item.enabled || !isConfigured;
          const isPreview = showUpgrade && item.enabled && isConfigured;

          return (
            <div
              key={item.key}
              className={`flex flex-col rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm transition hover:shadow-md ${
                isDisabled ? "opacity-60" : ""
              }`}
            >
              <div className={`mb-4 grid size-14 place-items-center rounded-2xl bg-gradient-to-br ${item.gradientClass}`}>
                <Icon aria-hidden className="size-7 text-white" />
              </div>
              <div className="mb-1 flex items-center gap-2">
                <p className="text-xs font-black uppercase tracking-wider text-[#7A6D5E]">
                  {item.category}
                </p>
                {item.enabled && isConfigured ? (
                  <span className="rounded-full bg-[#DDE8CD] px-2 py-0.5 text-[10px] font-black text-[#3F5F31]">
                    已启用
                  </span>
                ) : (
                  <span className="rounded-full bg-[#F7F1E7] px-2 py-0.5 text-[10px] font-black text-[#7A6D5E]">
                    未启用
                  </span>
                )}
              </div>
              <h3 className="text-xl font-black text-[#2B241E]">{item.displayTitle}</h3>
              <p className="mt-1 text-xs text-[#7A6D5E]">{item.role}</p>

              <ul className="mt-4 grid gap-2">
                {item.capabilities.slice(0, 4).map((cap) => (
                  <li key={cap} className="flex items-start gap-2 text-xs text-[#3F5F31]">
                    <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full ${item.colorClass}`}>
                      <span className="size-1.5 rounded-full bg-current" />
                    </span>
                    <span>{cap}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 pt-4 border-t border-[#E8DCCB]">
                {isDisabled ? (
                  <div className="flex items-center gap-2 text-xs text-[#7A6D5E]">
                    <AlertTriangle className="size-4" />
                    暂不可用
                  </div>
                ) : isPreview ? (
                  <Link
                    href={`/console/ai/${item.key}`}
                    className="flex items-center justify-between rounded-full bg-[#F7F1E7] px-4 py-2.5 text-sm font-black text-[#8C612E] transition hover:bg-[#EDE4D3]"
                  >
                    <span className="flex items-center gap-2">
                      <Crown className="size-4" />
                      查看介绍
                    </span>
                    <ArrowRight className="size-4" />
                  </Link>
                ) : (
                  <Link
                    href={`/console/ai/${item.key}`}
                    className="flex items-center justify-between rounded-full bg-[#2B241E] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#1a1612]"
                  >
                    立即使用
                    <ArrowRight className="size-4" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/console/knowledge"
          className="group flex items-start gap-4 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#DDE8CD] text-[#3F5F31]">
            <BookOpen className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black text-[#2B241E]">统一企业资料库</p>
              <ArrowRight className="size-4 text-[#7A6D5E] transition group-hover:translate-x-1" />
            </div>
            <p className="mt-1 text-xs text-[#7A6D5E]">
              集中管理公司资料、产品资料、FAQ、品牌语气、客户画像、SOP 和文档，让 AI 助手基于你的真实业务数据回答问题。
            </p>
          </div>
        </Link>

        <Link
          href="/console/ai-reception"
          className="group flex items-start gap-4 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#EAF3FF] text-[#2563EB]">
            <Bot className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black text-[#2B241E]">访客 AI 接待</p>
              <ArrowRight className="size-4 text-[#7A6D5E] transition group-hover:translate-x-1" />
            </div>
            <p className="mt-1 text-xs text-[#7A6D5E]">
              配置公开名片的 AI 客服，自动接待访客咨询。访客主动留下联系方式时，自动创建客户线索，可在客户线索中查看。
            </p>
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#F7F1E7] px-2 py-0.5 text-[10px] font-black text-[#8C612E]">
              <UserPlus className="size-3" />
              AI 转线索
            </p>
          </div>
        </Link>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
          <p className="text-sm font-black text-[#3F5F31]">套餐月度额度</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-[#2B241E]">
            {quota.planUsage.limit === -1 ? "∞" : quota.planUsage.used.toLocaleString()}
            <span className="text-sm text-[#7A6D5E]">
              {" "}
              / {quota.planUsage.limit === -1 ? "无限" : quota.planUsage.limit.toLocaleString()}
            </span>
          </p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#F7F1E7]">
            <div
              className="h-full rounded-full bg-[#6F8F4E]"
              style={{ width: `${quota.planUsage.percent ?? 0}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-[#7A6D5E]">
            {quota.planUsage.limit === -1
              ? "企业版无限额度，放心使用"
              : quota.planUsage.limit === 0
              ? "免费用户无正式额度，请升级会员"
              : `本月剩余 ${quota.planUsage.remaining.toLocaleString()} 次`}
          </p>
        </div>

        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
          <p className="text-sm font-black text-[#3F5F31]">今日调用次数</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-[#2B241E]">
            {quota.dailyUsage.used.toLocaleString()}
            <span className="text-sm text-[#7A6D5E]">
              {" "}
              / {quota.dailyUsage.limit === -1 ? "无限" : quota.dailyUsage.limit.toLocaleString()}
            </span>
          </p>
          <p className="mt-3 text-xs text-[#7A6D5E]">
            {quota.dailyUsage.limit === -1
              ? "企业版无每日上限"
              : quota.dailyUsage.remaining === 0
              ? "今日已达上限，请明天再试"
              : `今日剩余 ${quota.dailyUsage.remaining.toLocaleString()} 次`}
          </p>
        </div>

        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
          <p className="text-sm font-black text-[#3F5F31]">额外 Credit</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-[#2B241E]">
            {quota.creditBalance.toLocaleString()}
            <span className="text-sm text-[#7A6D5E]"> 次</span>
          </p>
          <p className="mt-3 text-xs text-[#7A6D5E]">
            {quota.creditBalance === 0
              ? "暂无额外 Credit，套餐额度用完后需升级或购买"
              : `额外额度可在套餐额度用完后继续使用`}
          </p>
          <Link
            href="/console/membership"
            className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full bg-[#8C612E] px-4 text-xs font-black text-white hover:bg-[#6F4F24]"
          >
            购买额度包
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
        <p className="text-sm font-black text-[#3F5F31]">配额使用顺序</p>
        <ul className="mt-3 grid gap-2 text-xs text-[#7A6D5E]">
          <li>1. 优先使用套餐月度点数（Plus 800 / Pro 3,000 / 企业版 15,000 / 企业 Pro 50,000）</li>
          <li>2. 标准 AI 回复 1 点，经营助手基础任务 5 点；高级分析任务按页面明确标注</li>
          <li>3. 套餐点数用完后，自动使用仍在有效期内的加量包点数</li>
          <li>4. 调用失败或超时不扣点，已经预扣的点数会自动回补</li>
          <li>5. 套餐过期后停止正式调用；套餐月度点数不结转</li>
        </ul>
      </section>

      <section className="mt-6 rounded-[28px] border border-[#E8DCCB] bg-gradient-to-br from-[#F6E7C8] to-[#E8DCCB] p-5 sm:p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-black text-[#8C612E]">企业级 AI 能力（规划中）</p>
            <h3 className="mt-1 text-xl font-black text-[#2B241E]">
              想拥有专属的企业知识库和定制 AI 助手？
            </h3>
            <p className="mt-1 text-xs text-[#7A6D5E]">
              升级到企业版，支持企业知识库上传、长期记忆、定制专属 AI 助手，让 AI 更懂你的业务。
            </p>
            <p className="mt-2 rounded-xl bg-white/60 px-3 py-2 text-xs font-bold text-[#8C612E]">
              注：企业知识库、长期记忆、定制 AI 助手等功能为 V0.2 规划中功能，当前版本暂未上线。
            </p>
          </div>
          <Link
            href="/console/membership"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-[#2B241E] px-6 text-sm font-black text-white hover:bg-[#1a1612]"
          >
            了解企业版
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </WorkbenchShell>
  );
}
