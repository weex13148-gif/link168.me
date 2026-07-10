"use client";

import Link from "next/link";
import { ExternalLink, Monitor, ShieldCheck, AlertTriangle } from "lucide-react";
import ShowcaseLayout from "./ShowcaseLayout";
import StatusBadge from "./StatusBadge";
import EvidencePanel from "./EvidencePanel";
import AIDemoStatus from "./AIDemoStatus";
import ShowcaseSection, { ShowcaseCard } from "./ShowcaseSection";
import {
  SHOWCASE_PROJECT,
  PRODUCT_CAPABILITIES,
  FIVE_MINUTE_PATH,
  TECH_SUMMARY,
  JUDGE_QA,
  PROGRESS_MILESTONES,
  capabilitiesByStatus,
} from "@/lib/showcase-config";

const NAV = [
  { id: "overview", label: "项目概览" },
  { id: "experience", label: "体验路径" },
  { id: "capabilities", label: "能力状态" },
  { id: "tech", label: "技术摘要" },
  { id: "ai-demo", label: "AI 演示" },
  { id: "progress", label: "项目进度" },
  { id: "qa", label: "答辩 Q&A" },
  { id: "evidence", label: "证据材料" },
  { id: "materials", label: "比赛资料" },
];

export default function JudgeShowcase() {
  const completed = capabilitiesByStatus("completed");
  const beta = capabilitiesByStatus("beta");
  const planned = capabilitiesByStatus("planned");

  return (
    <ShowcaseLayout mode="judge" navItems={NAV}>
      {/* Hero */}
      <section id="overview" className="scroll-mt-20 border-b border-[var(--ui-line)] bg-[var(--ui-surface)] py-14 sm:py-20">
        <div className="ui-container grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <p className="ui-eyebrow">{SHOWCASE_PROJECT.name} 评委专用</p>
            <h1 className="ui-title mt-4 max-w-4xl text-4xl leading-[1.12] sm:text-5xl lg:text-[58px]">{SHOWCASE_PROJECT.fullName}</h1>
            <p className="ui-muted mt-6 max-w-2xl text-base leading-8 sm:text-lg">
              当前版本 {SHOWCASE_PROJECT.version}，更新于 {SHOWCASE_PROJECT.updatedAt}。本页所有内容来自统一配置，后台修改后即时生效。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/" target="_blank" className="ui-button-primary min-h-12 px-6 text-base">
                打开真实产品 <ExternalLink className="size-4" />
              </Link>
              <a href="#experience" className="ui-button-secondary min-h-12 px-6 text-base">
                查看体验路径
              </a>
            </div>
          </div>
          <aside className="ui-surface divide-y divide-[var(--ui-line)] overflow-hidden">
            <div className="px-5 py-4 text-xs font-black text-[var(--ui-muted)]">当前展示状态</div>
            {[
              ["核心主页闭环", "已完成", "completed"],
              ["邮箱验证与找回密码", "已完成", "completed"],
              ["比赛资料下载", "已接通", "completed"],
              ["AI 助理", "内测中", "beta"],
              ["正式支付", "未来规划", "planned"],
            ].map(([name, status, statusType]) => (
              <div key={name} className="flex items-center justify-between gap-4 px-5 py-4">
                <span className="text-sm font-bold">{name}</span>
                <StatusBadge status={statusType as "completed" | "beta" | "planned"} />
              </div>
            ))}
          </aside>
        </div>
      </section>

      {/* Demo Account & Backup */}
      <section className="border-b border-[var(--ui-line)] bg-[var(--ui-page)] py-14 sm:py-16">
        <div className="ui-container grid gap-6 lg:grid-cols-2">
          <ShowcaseCard title="演示账号与访问说明" icon={<Monitor className="size-5 text-[var(--ui-brand)]" />}>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 border-b border-[var(--ui-line)] pb-2">
                <span className="text-[var(--ui-muted)]">用户名</span>
                <span className="font-bold">{SHOWCASE_PROJECT.demoAccount.username}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 border-b border-[var(--ui-line)] pb-2">
                <span className="text-[var(--ui-muted)]">密码</span>
                <span className="font-bold">{SHOWCASE_PROJECT.demoAccount.password}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-[var(--ui-muted)]">备注</span>
                <span className="font-bold">{SHOWCASE_PROJECT.demoAccount.note}</span>
              </div>
            </div>
          </ShowcaseCard>
          <ShowcaseCard title="网络故障备用方案" icon={<AlertTriangle className="size-5 text-[var(--ui-brand)]" />}>
            <p className="ui-muted mt-4 text-sm leading-6">
              若现场网络不稳定，可使用本页截图、已上传的比赛视频和离线备份包完成演示。所有关键页面均提供截图证据位，未提供的截图会在下方标记为“未提供”。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="#evidence" className="ui-button-secondary min-h-9 px-3 text-xs">查看证据清单</a>
              <a href="#materials" className="ui-button-secondary min-h-9 px-3 text-xs">查看比赛资料</a>
            </div>
          </ShowcaseCard>
        </div>
      </section>

      {/* 5 Minute Path */}
      <ShowcaseSection id="experience" eyebrow="推荐体验" title="五分钟推荐体验路径" description="每一步标注点击入口、验证目标、预计用时和功能状态。未完成能力标注为“内测”或“规划”。">
        <div className="mt-8 grid gap-4">
          {FIVE_MINUTE_PATH.map((step) => (
            <div key={step.step} className="ui-surface flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
              <div className="flex shrink-0 items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-[var(--ui-brand-soft)] text-sm font-black text-[var(--ui-brand)]">
                  {step.step}
                </span>
                <StatusBadge status={step.status} />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm">{step.title}</strong>
                  <span className="text-xs text-[var(--ui-faint)]">预计 {step.estimatedMinutes} 分钟</span>
                  {step.loginRequired ? <span className="rounded-full bg-[var(--ui-accent-soft)] px-2 py-0.5 text-[10px] font-black text-[#7D5B24]">需登录</span> : null}
                </div>
                <p className="ui-muted mt-1 text-sm leading-6">
                  <span className="font-bold text-[var(--ui-ink)]">入口：</span>
                  {step.entry} · <span className="font-bold text-[var(--ui-ink)]">目标：</span>
                  {step.target}
                </p>
                {step.href ? (
                  <Link href={step.href} target="_blank" className="ui-button-secondary mt-3 min-h-9 px-3 text-xs">
                    打开页面 <ExternalLink className="size-3" />
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </ShowcaseSection>

      {/* Capabilities */}
      <ShowcaseSection id="capabilities" eyebrow="能力清单" title="已完成、内测和规划能力界限清楚" description="所有能力均来自真实产品或明确标注的规划，不混淆状态。">
        <div className="grid gap-5 lg:grid-cols-3">
          <CapabilityGroup title="已完成" items={completed} />
          <CapabilityGroup title="内测中" items={beta} />
          <CapabilityGroup title="规划中" items={planned} />
        </div>
      </ShowcaseSection>

      {/* Tech Summary */}
      <ShowcaseSection id="tech" eyebrow="技术实现" title="技术栈与部署架构" description="所有技术选型基于真实代码仓库和 CI/CD 流程，不虚构技术能力。">
        <div className="grid gap-4 sm:grid-cols-2">
          <TechCard title="核心栈" items={TECH_SUMMARY.stack} />
          <TechCard title="AI 栈" items={TECH_SUMMARY.aiStack} />
          <TechCard title="部署" items={TECH_SUMMARY.deployment} />
          <TechCard title="安全" items={TECH_SUMMARY.security} />
          <div className="ui-surface p-5 sm:col-span-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-[var(--ui-brand)]" />
              <strong className="text-sm">代码与 CI</strong>
            </div>
            <p className="ui-muted mt-2 text-sm leading-6">{TECH_SUMMARY.repo}</p>
            <p className="mt-2 text-xs font-bold text-[var(--ui-success)]">{TECH_SUMMARY.ciStatus}</p>
          </div>
        </div>
      </ShowcaseSection>

      {/* AI Demo Status */}
      <ShowcaseSection id="ai-demo" eyebrow="AI 演示" title="AI 演示状态" description="实时展示 AI 调用状态，无法调用时明确显示原因。">
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

      {/* Progress */}
      <ShowcaseSection id="progress" eyebrow="项目进度" title="已完成、内测中、下一阶段" description="进度来自真实产品边界，后台配置管理，可实时更新。">
        <div className="grid gap-4">
          {PROGRESS_MILESTONES.map((group) => (
            <div key={group.phase} className="ui-surface overflow-hidden">
              <div className="flex items-center gap-3 border-b border-[var(--ui-line)] px-5 py-3">
                <StatusBadge status={group.status} text={group.phase} />
              </div>
              <ul className="divide-y divide-[var(--ui-line)]">
                {group.items.map((item) => (
                  <li key={item} className="px-5 py-3 text-sm text-[var(--ui-muted)]">{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </ShowcaseSection>

      {/* Q&A */}
      <ShowcaseSection id="qa" eyebrow="答辩准备" title="评委常见问答" description="基于真实产品状态回答，不编造数据。">
        <div className="grid gap-4">
          {JUDGE_QA.map((qa, index) => (
            <div key={index} className="ui-surface p-5">
              <p className="text-sm font-bold text-[var(--ui-brand)]">Q：{qa.q}</p>
              <p className="ui-muted mt-3 text-sm leading-7">A：{qa.a}</p>
            </div>
          ))}
        </div>
      </ShowcaseSection>

      {/* Evidence */}
      <div id="evidence">
        <EvidencePanel />
      </div>

      {/* Materials */}
      <section id="materials" className="scroll-mt-20 border-b border-[var(--ui-line)] bg-[var(--ui-page)] py-14 sm:py-16">
        <div className="ui-container">
          <p className="ui-eyebrow">比赛资料</p>
          <h2 className="ui-title mt-3 text-3xl leading-tight sm:text-4xl">比赛资料下载</h2>
          <p className="ui-muted mt-4 leading-7">
            所有资料由超级管理员在比赛中心上传，下方列表实时反映文件库状态。
          </p>
          <div className="mt-8">
            <div className="ui-surface p-8 text-center">
              <p className="text-sm font-bold text-[var(--ui-muted)]">
                比赛资料清单与下载请访问统一展示页 /showcase 或使用后台「比赛中心 → 文件管理」。
              </p>
              <Link href="/showcase" className="ui-button-secondary mt-4 inline-flex">
                前往原始展示页
              </Link>
            </div>
          </div>
        </div>
      </section>
    </ShowcaseLayout>
  );
}

function CapabilityGroup({ title, items }: { title: string; items: typeof PRODUCT_CAPABILITIES }) {
  return (
    <div className="ui-surface overflow-hidden">
      <div className="flex items-center gap-3 border-b border-[var(--ui-line)] px-5 py-3">
        <span className="text-sm font-black">{title}</span>
        <span className="rounded-full bg-[var(--ui-surface-muted)] px-2.5 py-0.5 text-xs font-black text-[var(--ui-muted)]">{items.length}</span>
      </div>
      <div className="divide-y divide-[var(--ui-line)]">
        {items.map((item) => (
          <div key={item.name} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-sm">{item.name}</strong>
                <StatusBadge status={item.status} />
                {item.loginRequired ? <span className="rounded-full bg-[var(--ui-accent-soft)] px-2 py-0.5 text-[10px] font-black text-[#7D5B24]">需登录</span> : null}
              </div>
              <p className="ui-muted mt-1 text-sm leading-6">{item.note}</p>
            </div>
            {item.href ? (
              <Link href={item.href} target="_blank" className="ui-button-secondary min-h-9 shrink-0 px-3 text-xs">
                查看 <ExternalLink className="size-3" />
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function TechCard({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div className="ui-surface p-5">
      <strong className="text-sm">{title}</strong>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-[var(--ui-muted)]">
            <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-[var(--ui-brand)]" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}