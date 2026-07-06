"use client";

import Link from "next/link";
import { ExternalLink, Building2, ShieldCheck, Eye, CreditCard, Handshake } from "lucide-react";
import ShowcaseLayout from "./ShowcaseLayout";
import StatusBadge from "./StatusBadge";
import EvidencePanel from "./EvidencePanel";
import AIDemoStatus from "./AIDemoStatus";
import ShowcaseSection, { ShowcaseCard } from "./ShowcaseSection";
import {
  SHOWCASE_PROJECT,
  PRODUCT_CAPABILITIES,
  COMPLIANCE_MATERIALS,
  GOVERNMENT_PLAN,
  CURRENT_STAGE_STATEMENT,
  capabilitiesByStatus,
} from "@/lib/showcase-config";

const NAV = [
  { id: "overview", label: "主体信息" },
  { id: "product", label: "产品状态" },
  { id: "value", label: "社会价值" },
  { id: "security", label: "数据与安全" },
  { id: "ai", label: "AI 治理" },
  { id: "content", label: "内容审核" },
  { id: "payment", label: "支付审计" },
  { id: "ai-demo", label: "AI 演示" },
  { id: "cooperation", label: "地方与园区" },
  { id: "evidence", label: "证据材料" },
];

export default function GovernmentShowcase() {
  const completed = capabilitiesByStatus("completed");

  return (
    <ShowcaseLayout mode="government" navItems={NAV}>
      {/* Hero */}
      <section id="overview" className="scroll-mt-20 border-b border-[var(--ui-line)] bg-[var(--ui-surface)] py-14 sm:py-20">
        <div className="ui-container grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <p className="ui-eyebrow">{SHOWCASE_PROJECT.name} 政府与园区合作</p>
            <h1 className="ui-title mt-4 max-w-4xl text-4xl leading-[1.12] sm:text-5xl lg:text-[58px]">{SHOWCASE_PROJECT.fullName}</h1>
            <p className="ui-muted mt-6 max-w-2xl text-base leading-8 sm:text-lg">
              {CURRENT_STAGE_STATEMENT}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/" target="_blank" className="ui-button-primary min-h-12 px-6 text-base">
                查看真实产品 <ExternalLink className="size-4" />
              </Link>
              <a href="#cooperation" className="ui-button-secondary min-h-12 px-6 text-base">
                园区合作方案
              </a>
            </div>
          </div>
          <aside className="ui-surface divide-y divide-[var(--ui-line)] overflow-hidden">
            <div className="px-5 py-4 text-xs font-black text-[var(--ui-muted)]">主体与备案</div>
            {[
              ["公司主体", SHOWCASE_PROJECT.company.name, "completed"],
              ["域名", SHOWCASE_PROJECT.domain, "completed"],
              ["ICP 备案", SHOWCASE_PROJECT.icp, "beta"],
              ["项目负责人", SHOWCASE_PROJECT.team.leader, "completed"],
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

      {/* Product Status */}
      <ShowcaseSection id="product" eyebrow="产品状态" title="当前产品状态与服务对象" description="产品已具备真实运营能力，处于内测验证阶段，服务对象为小微商户、创业者和自由职业者。">
        <div className="grid gap-4">
          <ShowcaseCard title="服务对象" icon={<Building2 className="size-4 text-[var(--ui-brand)]" />}>
            <ul className="mt-3 space-y-2 text-sm text-[var(--ui-muted)]">
              <li>· 小微商户：餐饮、美业、教培、零售、电商</li>
              <li>· 创业者：一人公司、自由职业者、顾问、设计师</li>
              <li>· 创作者：公众号/小红书/抖音/快手博主</li>
              <li>· 就业促进：降低个体经营数字化门槛</li>
            </ul>
          </ShowcaseCard>
          <ShowcaseCard title="已完成核心能力" icon={<ShieldCheck className="size-4 text-[var(--ui-brand)]" />}>
            <div className="mt-3 flex flex-wrap gap-2">
              {completed.slice(0, 6).map((c) => (
                <span key={c.name} className="rounded-full bg-[var(--ui-success-soft)] px-3 py-1 text-xs font-black text-[var(--ui-success)]">{c.name}</span>
              ))}
              <span className="rounded-full bg-[var(--ui-surface-muted)] px-3 py-1 text-xs font-black text-[var(--ui-muted)]">等共 {completed.length} 项</span>
            </div>
          </ShowcaseCard>
        </div>
      </ShowcaseSection>

      {/* Social Value */}
      <ShowcaseSection id="value" eyebrow="社会价值" title="对小微商户、创业者和就业的价值" description="不使用夸大、保证收益或政策背书式表述，仅陈述产品实际能力带来的社会价值。">
        <div className="grid gap-4 sm:grid-cols-2">
          {GOVERNMENT_PLAN.valueToSMEs.map((v) => (
            <div key={v} className="ui-surface p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 block size-2 shrink-0 rounded-full bg-[var(--ui-brand)]" />
                <p className="text-sm leading-6 text-[var(--ui-muted)]">{v}</p>
              </div>
            </div>
          ))}
        </div>
      </ShowcaseSection>

      {/* Data Security */}
      <ShowcaseSection id="security" eyebrow="数据与安全" title="数据存储与安全措施" description="所有安全措施基于真实代码实现，不虚构安全等级。">
        <div className="grid gap-4">
          <ShowcaseCard title="数据安全" icon={<ShieldCheck className="size-4 text-[var(--ui-brand)]" />}>
            <ul className="mt-3 space-y-2">
              {GOVERNMENT_PLAN.dataSecurity.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm text-[var(--ui-muted)]">
                  <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-[var(--ui-brand)]" />
                  {s}
                </li>
              ))}
            </ul>
          </ShowcaseCard>
          <ShowcaseCard title="用户隐私权利" icon={<Eye className="size-4 text-[var(--ui-brand)]" />}>
            <ul className="mt-3 space-y-2">
              {GOVERNMENT_PLAN.userPrivacy.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm text-[var(--ui-muted)]">
                  <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-[var(--ui-brand)]" />
                  {s}
                </li>
              ))}
            </ul>
          </ShowcaseCard>
        </div>
      </ShowcaseSection>

      {/* AI Governance */}
      <ShowcaseSection id="ai" eyebrow="AI 治理" title="AI 标识与风险治理" description="AI 能力已接入阿里云百炼，通过后端代理调用，浏览器不接触 API Key。">
        <div className="grid gap-4">
          {GOVERNMENT_PLAN.aiGovernance.map((item) => (
            <div key={item} className="ui-surface p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 block size-2 shrink-0 rounded-full bg-[var(--ui-brand)]" />
                <p className="text-sm leading-6 text-[var(--ui-muted)]">{item}</p>
              </div>
            </div>
          ))}
        </div>
      </ShowcaseSection>

      {/* Content Governance */}
      <ShowcaseSection id="content" eyebrow="内容治理" title="内容审核与举报流程" description="已建立前端举报入口、后台人工审核与状态机、审计日志追溯的完整闭环。">
        <div className="grid gap-4">
          {GOVERNMENT_PLAN.contentGovernance.map((item) => (
            <div key={item} className="ui-surface p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 block size-2 shrink-0 rounded-full bg-[var(--ui-brand)]" />
                <p className="text-sm leading-6 text-[var(--ui-muted)]">{item}</p>
              </div>
            </div>
          ))}
        </div>
      </ShowcaseSection>

      {/* Payment Audit */}
      <ShowcaseSection id="payment" eyebrow="支付审计" title="支付、订单和审计规则" description="支付金额由服务端生成，不信任浏览器传入。支付宝回调实现签名验证、订单校验和幂等保护。">
        <div className="grid gap-4">
          {GOVERNMENT_PLAN.paymentAudit.map((item) => (
            <div key={item} className="ui-surface p-5">
              <div className="flex items-start gap-3">
                <CreditCard className="mt-0.5 size-4 shrink-0 text-[var(--ui-brand)]" />
                <p className="text-sm leading-6 text-[var(--ui-muted)]">{item}</p>
              </div>
            </div>
          ))}
        </div>
      </ShowcaseSection>

      {/* AI Demo Status */}
      <ShowcaseSection id="ai-demo" eyebrow="AI 演示" title="AI 演示状态" description="实时展示 AI 调用状态，包含安全与合规信息。">
        <div className="mt-8">
          <AIDemoStatus
            status="available"
            modelInfo={{
              name: "—",
              version: "—",
            }}
          />
        </div>
      </ShowcaseSection>

      {/* Cooperation */}
      <ShowcaseSection id="cooperation" eyebrow="地方与园区" title="地方落地计划与园区合作" description="提供可开展的园区合作与培训方案，不承诺固定落地时间表。">
        <div className="grid gap-4">
          {GOVERNMENT_PLAN.localLanding.map((item) => (
            <div key={item} className="ui-surface p-5">
              <div className="flex items-start gap-3">
                <Handshake className="mt-0.5 size-4 shrink-0 text-[var(--ui-brand)]" />
                <p className="text-sm leading-6 text-[var(--ui-muted)]">{item}</p>
              </div>
            </div>
          ))}
        </div>
      </ShowcaseSection>

      <div id="evidence">
        <EvidencePanel />
      </div>
    </ShowcaseLayout>
  );
}