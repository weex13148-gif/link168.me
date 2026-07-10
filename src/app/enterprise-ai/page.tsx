import Link from "next/link";
import { ArrowRight, Bot, BriefcaseBusiness, Building2, FileText, Palette, Scale, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const assistants = [
  { title: "财税 AI Agent", text: "收入、成本、税费、经营资料辅助整理和经营提醒。", icon: FileText },
  { title: "法务 AI Agent", text: "合同风险初筛、协议条款解释、合规提醒和审阅清单生成。", icon: Scale },
  { title: "市场调研 AI Agent", text: "行业分析、竞品分析、城市市场判断、目标用户画像和推广建议。", icon: BriefcaseBusiness },
  { title: "设计 AI Agent", text: "主页视觉建议、海报创意、商品宣传图、品牌风格和活动物料建议。", icon: Palette },
  { title: "社媒运营 AI Agent", text: "小红书、抖音、朋友圈、公众号内容选题、标题、脚本和发布计划。", icon: Sparkles },
];

const enterpriseFeatures = ["团队管理", "企业资料库", "长期记忆", "使用次数管理", "专属 AI 助理配置", "企业定制服务"];

export default function EnterpriseAiPage() {
  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_12%_18%,rgba(221,232,205,0.72),transparent_28%),linear-gradient(135deg,#FFFDF8_0%,#F7F1E7_58%,#F2E7D8_100%)] px-4 py-6 text-[var(--ui-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <BrandLogo size="header" />
        <Link href="/login" className="rounded-full border border-[var(--ui-line)] bg-[var(--ui-surface)] px-4 py-2 text-sm font-black text-[var(--ui-brand)] shadow-sm">
          返回登录页
        </Link>
      </div>

      <section className="mx-auto mt-10 grid w-full max-w-6xl gap-8 lg:grid-cols-[1fr_0.82fr] lg:items-center">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--ui-line)] bg-[var(--ui-surface)]/86 px-4 py-2 text-sm font-black text-[var(--ui-brand)]">
            <Bot aria-hidden className="size-4" />
            AI 经营名片平台 · 内测展示版
          </p>
          <h1 className="mt-6 text-5xl font-black leading-tight tracking-tight sm:text-6xl">一张二维码数字名片 + 五大 AI Agent，小商家低成本获客与经营</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--ui-muted)]">
            面向自媒体、小商家和一人公司，免费二维码数字名片承接流量，五大 AI Agent（财税、法务、市场调研、设计、社媒运营）辅助经营决策与内容生成。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/enterprise-ai/dashboard" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#6F8F4E] px-6 text-sm font-black text-white shadow-lg shadow-[#6F8F4E]/20">
              进入工作台预览
              <ArrowRight aria-hidden className="size-4" />
            </Link>
            <a href="mailto:business@link168.me" className="inline-flex min-h-12 items-center rounded-full border border-[var(--ui-line)] bg-[var(--ui-surface)] px-6 text-sm font-black text-[var(--ui-brand)]">
              企业 AI 服务：business@link168.me
            </a>
          </div>
        </div>

        <div className="rounded-[32px] border border-[var(--ui-line)] bg-[var(--ui-surface)]/90 p-6 shadow-[0_24px_80px_rgba(86,68,46,0.12)]">
          <div className="grid size-14 place-items-center rounded-2xl bg-[#DDE8CD] text-[var(--ui-brand)]">
            <Building2 aria-hidden className="size-7" />
          </div>
          <h2 className="mt-5 text-2xl font-black">企业版能力展示</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {enterpriseFeatures.map((item) => (
              <span key={item} className="rounded-2xl bg-[var(--ui-page)] px-4 py-3 text-sm font-black text-[var(--ui-brand)]">
                {item}
              </span>
            ))}
          </div>
          <p className="mt-5 rounded-2xl bg-[#F6E7C8] px-4 py-3 text-sm font-bold leading-6 text-[var(--ui-accent)]">
            当前为 V0.1 内测版本，五大 AI Agent 采用白名单制开放（普通用户默认不开放完整 AI 能力）。AI 输出内容仅供参考，不构成正式财税、法律意见，也不保证商业结果。
          </p>
        </div>
      </section>

      <section className="mx-auto mt-10 grid w-full max-w-6xl gap-4 md:grid-cols-2 lg:grid-cols-5">
          {assistants.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-[26px] border border-[var(--ui-line)] bg-[var(--ui-surface-strong)]/92 p-5 shadow-sm">
                <div className="grid size-11 place-items-center rounded-2xl bg-[#DDE8CD] text-[var(--ui-brand)]">
                  <Icon aria-hidden className="size-5" />
                </div>
                <h3 className="mt-4 text-lg font-black">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--ui-muted)]">{item.text}</p>
                <p className="mt-4 rounded-xl bg-[#FFF7E0] px-3 py-2 text-xs font-black text-[var(--ui-accent)]">V0.1 内测 · 白名单可用</p>
              </article>
            );
          })}
        </section>
    </main>
  );
}
