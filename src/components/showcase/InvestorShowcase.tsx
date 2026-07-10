"use client";

import Link from "next/link";
import { ExternalLink, TrendingUp, Users, DollarSign, Target, ShieldCheck } from "lucide-react";
import ShowcaseLayout from "./ShowcaseLayout";
import StatusBadge from "./StatusBadge";
import EvidencePanel from "./EvidencePanel";
import AIDemoStatus from "./AIDemoStatus";
import ShowcaseSection, { ShowcaseCard } from "./ShowcaseSection";
import {
  SHOWCASE_PROJECT,
  PRODUCT_CAPABILITIES,
  getShowcasePlans,
  getShowcaseRevenueModel,
  CURRENT_STAGE_STATEMENT,
  INVESTOR_ASSUMPTIONS,
  COMPETITOR_COMPARISON,
  GROWTH_CHANNELS,
  TWELVE_MONTH_PLAN,
  CURRENT_BARRIERS,
  capabilitiesByStatus,
} from "@/lib/showcase-config";

const NAV = [
  { id: "overview", label: "项目概览" },
  { id: "problem", label: "用户与价值" },
  { id: "model", label: "商业模式" },
  { id: "costs", label: "成本结构" },
  { id: "growth", label: "增长计划" },
  { id: "competition", label: "竞品与壁垒" },
  { id: "ai-demo", label: "AI 演示" },
  { id: "progress", label: "真实进展" },
  { id: "evidence", label: "证据材料" },
];

export default function InvestorShowcase() {
  const plans = getShowcasePlans();
  const revenue = getShowcaseRevenueModel();
  const completed = capabilitiesByStatus("completed");

  return (
    <ShowcaseLayout mode="investor" navItems={NAV}>
      {/* Hero */}
      <section id="overview" className="scroll-mt-20 border-b border-[var(--ui-line)] bg-[var(--ui-surface)] py-14 sm:py-20">
        <div className="ui-container grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <p className="ui-eyebrow">{SHOWCASE_PROJECT.name} 投资人尽调</p>
            <h1 className="ui-title mt-4 max-w-4xl text-4xl leading-[1.12] sm:text-5xl lg:text-[58px]">{SHOWCASE_PROJECT.fullName}</h1>
            <p className="ui-muted mt-6 max-w-2xl text-base leading-8 sm:text-lg">
              {CURRENT_STAGE_STATEMENT}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/" target="_blank" className="ui-button-primary min-h-12 px-6 text-base">
                查看真实产品 <ExternalLink className="size-4" />
              </Link>
              <a href="#model" className="ui-button-secondary min-h-12 px-6 text-base">
                商业模式
              </a>
            </div>
          </div>
          <aside className="ui-surface divide-y divide-[var(--ui-line)] overflow-hidden">
            <div className="px-5 py-4 text-xs font-black text-[var(--ui-muted)]">关键数字（真实或标注假设）</div>
            {[
              ["已完成能力", `${completed.length} 项`, "completed"],
              ["公开套餐", `${plans.length} 档`, "completed"],
              ["AI 调用成本", "¥0.02–0.08/次", "beta"],
              ["当前阶段", "MVP / PMF 前", "planned"],
            ].map(([name, value, statusType]) => (
              <div key={name} className="flex items-center justify-between gap-4 px-5 py-4">
                <span className="text-sm font-bold">{name}</span>
                <StatusBadge status={statusType as "completed" | "beta" | "planned"} text={value} />
              </div>
            ))}
          </aside>
        </div>
      </section>

      {/* Problem & Value */}
      <ShowcaseSection id="problem" eyebrow="用户与价值" title="用户问题、目标客户与核心价值" description="目标用户为中文创作者、小商家和一人公司，他们需要低门槛的经营入口。">
        <div className="grid gap-4 sm:grid-cols-2">
          <ShowcaseCard title="目标客户" icon={<Users className="size-4 text-[var(--ui-brand)]" />}>
            <ul className="mt-3 space-y-2 text-sm text-[var(--ui-muted)]">
              <li>· 自媒体创作者（公众号/小红书/抖音）</li>
              <li>· 小商家（餐饮、美业、教培、电商）</li>
              <li>· 一人公司（顾问、设计、开发、咨询）</li>
            </ul>
          </ShowcaseCard>
          <ShowcaseCard title="核心价值" icon={<Target className="size-4 text-[var(--ui-brand)]" />}>
            <ul className="mt-3 space-y-2 text-sm text-[var(--ui-muted)]">
              <li>· 一张二维码承载完整经营闭环</li>
              <li>· 零代码创建可更新的数字名片</li>
              <li>· AI 助理降低经营知识门槛</li>
            </ul>
          </ShowcaseCard>
          <div className="ui-surface p-5 sm:col-span-2">
            <strong className="text-sm">用户问题</strong>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                "公域流量分散，算法变动影响大",
                "私域沉淀困难，粉丝导入后失活",
                "小团队缺少设计、运营、法务、财税能力",
                "传统名片只能展示，无法更新和收集线索",
                "内容、服务、联系方式散落在多个平台",
              ].map((p) => (
                <div key={p} className="rounded-[var(--ui-radius-sm)] bg-[var(--ui-surface-muted)] p-3 text-sm text-[var(--ui-muted)]">{p}</div>
              ))}
            </div>
          </div>
        </div>
      </ShowcaseSection>

      {/* Business Model */}
      <ShowcaseSection id="model" eyebrow="商业模式" title="套餐与收入来源" description="价格引用正式业务配置，无 ¥? 或待定价格。企业版需联系销售。">
        <div className="grid gap-5">
          <div className="ui-surface divide-y divide-[var(--ui-line)] overflow-hidden">
            {plans.map((plan) => (
              <div key={plan.code} className="grid gap-2 p-5 sm:grid-cols-[140px_120px_1fr]">
                <strong className="text-sm">{plan.name}</strong>
                <span className="font-black text-[var(--ui-brand-hover)]">{plan.priceDisplayYearly}</span>
                <span className="ui-muted text-sm">{plan.description}</span>
              </div>
            ))}
          </div>
          <div className="ui-surface divide-y divide-[var(--ui-line)] overflow-hidden">
            <div className="px-5 py-3 text-xs font-black text-[var(--ui-muted)]">收入来源</div>
            {revenue.map((r) => (
              <div key={r.name} className="grid gap-2 p-5 sm:grid-cols-[140px_120px_1fr]">
                <strong className="text-sm">{r.name}</strong>
                <span className="font-black text-[var(--ui-brand-hover)]">{r.price}</span>
                <span className="ui-muted text-sm">{r.note} · {r.stage}</span>
              </div>
            ))}
          </div>
        </div>
      </ShowcaseSection>

      {/* Costs & Assumptions */}
      <ShowcaseSection id="costs" eyebrow="成本与测算" title="成本结构与毛利率假设" description="以下测算均标记为假设，不编造营业收入和付费用户。未验证的市场规模使用区间表达。">
        <div className="grid gap-4">
          {INVESTOR_ASSUMPTIONS.map((a) => (
            <div key={a.label} className="ui-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-sm">{a.label}</strong>
                <span className="font-black text-[var(--ui-brand-hover)]">{a.value}</span>
              </div>
              <p className="ui-muted mt-2 text-xs leading-5">{a.note}</p>
            </div>
          ))}
          <div className="rounded-[var(--ui-radius-sm)] bg-[var(--ui-accent-soft)] p-5">
            <div className="flex items-center gap-2">
              <DollarSign className="size-4 text-[#7D5B24]" />
              <strong className="text-sm text-[#7D5B24]">毛利率测算（假设）</strong>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#7D5B24]">
              以 Pro 年付 388 元为例，扣除服务器分摊、AI 调用成本和支付手续费后，估算毛利率约 60%–75%。
              实际毛利率取决于用户规模、AI 调用频率和基础设施利用率。
            </p>
          </div>
        </div>
      </ShowcaseSection>

      {/* Growth */}
      <ShowcaseSection id="growth" eyebrow="增长计划" title="冷启动渠道与十二个月路径" description="当前阶段为“可收费验证型 MVP / PMF 前”，以下为阶段目标而非收入承诺。">
        <div className="grid gap-5">
          <ShowcaseCard title="冷启动渠道" icon={<TrendingUp className="size-4 text-[var(--ui-brand)]" />}>
            <ul className="mt-3 space-y-2">
              {GROWTH_CHANNELS.map((ch) => (
                <li key={ch} className="flex items-start gap-2 text-sm text-[var(--ui-muted)]">
                  <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-[var(--ui-brand)]" />
                  {ch}
                </li>
              ))}
            </ul>
          </ShowcaseCard>
          <div className="ui-surface overflow-hidden">
            <div className="border-b border-[var(--ui-line)] px-5 py-3 text-xs font-black text-[var(--ui-muted)]">未来十二个月计划（假设性目标）</div>
            <div className="divide-y divide-[var(--ui-line)]">
              {TWELVE_MONTH_PLAN.map((m) => (
                <div key={m.month} className="grid gap-2 p-5 sm:grid-cols-[80px_1fr_1fr]">
                  <span className="text-sm font-black text-[var(--ui-brand)]">{m.month} 月</span>
                  <span className="text-sm text-[var(--ui-muted)]">{m.focus}</span>
                  <span className="text-xs font-bold text-[var(--ui-success)]">{m.milestone}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ShowcaseSection>

      {/* Competition & Barriers */}
      <ShowcaseSection id="competition" eyebrow="竞争与壁垒" title="竞品与替代方案、当前壁垒" description="不夸大竞争优势，仅陈述基于产品实际能力的差异点。">
        <div className="grid gap-5">
          <div className="ui-surface overflow-hidden">
            <div className="grid grid-cols-4 border-b border-[var(--ui-line)] px-5 py-3 text-xs font-black text-[var(--ui-muted)]">
              <span>竞品</span>
              <span>优势</span>
              <span>劣势</span>
              <span>我们的差异</span>
            </div>
            <div className="divide-y divide-[var(--ui-line)]">
              {COMPETITOR_COMPARISON.map((c) => (
                <div key={c.name} className="grid gap-2 p-5 sm:grid-cols-4">
                  <span className="text-sm font-bold">{c.name}</span>
                  <span className="text-sm text-[var(--ui-muted)]">{c.strength}</span>
                  <span className="text-sm text-[var(--ui-muted)]">{c.weakness}</span>
                  <span className="text-sm font-bold text-[var(--ui-brand)]">{c.ourEdge}</span>
                </div>
              ))}
            </div>
          </div>
          <ShowcaseCard title="当前壁垒" icon={<ShieldCheck className="size-4 text-[var(--ui-brand)]" />}>
            <ul className="mt-3 space-y-2">
              {CURRENT_BARRIERS.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-[var(--ui-muted)]">
                  <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-[var(--ui-brand)]" />
                  {b}
                </li>
              ))}
            </ul>
          </ShowcaseCard>
        </div>
      </ShowcaseSection>

      {/* AI Demo Status */}
      <ShowcaseSection id="ai-demo" eyebrow="AI 演示" title="AI 演示状态" description="实时展示 AI 调用状态，包含成本预估。">
        <div className="mt-8">
          <AIDemoStatus
            status="available"
            modelInfo={{
              name: "—",
              version: "—",
              cost: "—",
            }}
          />
        </div>
      </ShowcaseSection>

      {/* Progress */}
      <ShowcaseSection id="progress" eyebrow="真实进展" title="当前真实进展与合作/融资诉求" description="当前阶段明确标记为“可收费验证型 MVP / PMF 前”，所有能力状态来自真实代码。">
        <div className="grid gap-4">
          <div className="rounded-[var(--ui-radius-sm)] bg-[var(--ui-brand-soft)] p-5">
            <strong className="text-sm text-[var(--ui-brand)]">当前阶段声明</strong>
            <p className="mt-2 text-sm leading-7 text-[var(--ui-brand)]">{CURRENT_STAGE_STATEMENT}</p>
          </div>
          <ShowcaseCard title="合作或融资诉求">
            <ul className="mt-3 space-y-2 text-sm text-[var(--ui-muted)]">
              <li>· 寻求园区、孵化器和小商家协会的合作试点</li>
              <li>· 欢迎对产品方向、商业模式和技术架构提出反馈</li>
              <li>· 融资计划：在验证 PMF 后启动天使轮，当前以产品验证为主</li>
            </ul>
          </ShowcaseCard>
        </div>
      </ShowcaseSection>

      <div id="evidence">
        <EvidencePanel />
      </div>
    </ShowcaseLayout>
  );
}