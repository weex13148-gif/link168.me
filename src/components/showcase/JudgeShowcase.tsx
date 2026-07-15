"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Building2, ExternalLink, KeyRound, ShieldCheck } from "lucide-react";
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
  { id: "company", label: "主体信息" },
  { id: "experience", label: "体验路径" },
  { id: "capabilities", label: "能力状态" },
  { id: "tech", label: "技术摘要" },
  { id: "ai-demo", label: "AI 状态" },
  { id: "progress", label: "项目进度" },
  { id: "qa", label: "答辩 Q&A" },
  { id: "evidence", label: "证据材料" },
  { id: "materials", label: "比赛资料" },
];

export default function JudgeShowcase() {
  const completed = capabilitiesByStatus("completed");
  const pendingValidation = capabilitiesByStatus("pending_validation");
  const beta = capabilitiesByStatus("beta");
  const planned = capabilitiesByStatus("planned");

  return (
    <ShowcaseLayout mode="judge" navItems={NAV}>
      <section id="overview" className="scroll-mt-20 border-b border-[var(--ui-line)] bg-[var(--ui-surface)] py-14 sm:py-20">
        <div className="ui-container grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <p className="ui-eyebrow">{SHOWCASE_PROJECT.name} 评委专用</p>
            <h1 className="ui-title mt-4 max-w-4xl text-4xl leading-[1.12] sm:text-5xl lg:text-[58px]">{SHOWCASE_PROJECT.fullName}</h1>
            <p className="ui-muted mt-6 max-w-2xl text-base leading-8 sm:text-lg">
              当前版本 {SHOWCASE_PROJECT.version}，更新于 {SHOWCASE_PROJECT.updatedAt}。本页明确区分代码与自动测试结果、待生产配置验证、内测和下一阶段，不把尚未验证的外部服务描述为已上线。
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
            <div className="px-5 py-4 text-xs font-black text-[var(--ui-muted)]">当前发布状态</div>
            {[
              ["核心经营闭环", "自动测试通过", "completed"],
              ["发布门禁", "Prisma / TS / Lint / Jest / Build", "completed"],
              ["外部服务", "待生产配置验证", "pending_validation"],
              ["生产部署", "尚未执行", "pending_validation"],
            ].map(([name, status, statusType]) => (
              <div key={name} className="flex items-center justify-between gap-4 px-5 py-4">
                <span className="text-sm font-bold">{name}</span>
                <StatusBadge status={statusType as "completed" | "pending_validation"} text={status} />
              </div>
            ))}
          </aside>
        </div>
      </section>

      <section id="company" className="scroll-mt-20 border-b border-[var(--ui-line)] bg-[var(--ui-page)] py-14 sm:py-16">
        <div className="ui-container grid gap-6 lg:grid-cols-2">
          <ShowcaseCard title="公司主体与备案" icon={<Building2 className="size-5 text-[var(--ui-brand)]" />}>
            <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="shrink-0 overflow-hidden rounded-[var(--ui-radius-md)] border border-[var(--ui-line)] bg-white p-2">
                <Image
                  src={SHOWCASE_PROJECT.company.logoUrl}
                  alt={`${SHOWCASE_PROJECT.company.name} Logo`}
                  width={132}
                  height={132}
                  className="size-28 object-contain sm:size-32"
                />
              </div>
              <dl className="min-w-0 flex-1 divide-y divide-[var(--ui-line)] text-sm">
                {[
                  ["公司名称", SHOWCASE_PROJECT.company.name],
                  ["统一社会信用代码", SHOWCASE_PROJECT.company.unifiedSocialCreditCode],
                  ["法定代表人", SHOWCASE_PROJECT.company.legalRep],
                  ["注册资本", SHOWCASE_PROJECT.company.registeredCapital],
                  ["成立日期", SHOWCASE_PROJECT.company.establishedAt],
                  ["注册地区", SHOWCASE_PROJECT.company.registeredRegion],
                  ["ICP备案", SHOWCASE_PROJECT.icp],
                  ["联系邮箱", SHOWCASE_PROJECT.company.contactEmail],
                ].map(([label, value]) => (
                  <div key={label} className="grid gap-1 py-2.5 sm:grid-cols-[132px_minmax(0,1fr)]">
                    <dt className="text-[var(--ui-muted)]">{label}</dt>
                    <dd className="break-all font-bold text-[var(--ui-ink)]">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </ShowcaseCard>

          <div className="grid gap-6">
            <ShowcaseCard title="共享密码访问说明" icon={<KeyRound className="size-5 text-[var(--ui-brand)]" />}>
              <p className="ui-muted mt-4 text-sm leading-7">
                本展示页只使用比赛共享密码，不提供网页演示账号。验证成功后当前设备持续保持访问；项目方在后台更换密码后，旧设备凭证立即失效并要求重新输入新密码。
              </p>
              <p className="mt-3 text-xs font-bold text-[var(--ui-brand)]">页面浏览、文件下载和错误密码重试不设置应用级次数限制。</p>
            </ShowcaseCard>
            <ShowcaseCard title="弱网与材料边界" icon={<AlertTriangle className="size-5 text-[var(--ui-brand)]" />}>
              <p className="ui-muted mt-4 text-sm leading-7">
                比赛中心支持上传 PPT、PDF、视频和截图。只有真实上传的材料才会作为证据使用；未上传内容继续明确标记为“未提供”，不会显示“已接通”或虚构离线备份。
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href="#evidence" className="ui-button-secondary min-h-9 px-3 text-xs">查看证据清单</a>
                <a href="#materials" className="ui-button-secondary min-h-9 px-3 text-xs">查看比赛资料说明</a>
              </div>
            </ShowcaseCard>
          </div>
        </div>
      </section>

      <ShowcaseSection id="experience" eyebrow="推荐体验" title="五分钟推荐体验路径" description="路径统一为首页、账号、/console、经营名片、公开主页、Lead、分析和 /jeepwork；每一步均标注当前真实状态。">
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

      <ShowcaseSection id="capabilities" eyebrow="能力清单" title="代码完成、待生产验证、内测和下一阶段边界清楚" description="所有状态以代码、自动测试、真实配置和生产验证证据为准。">
        <div className="grid gap-5 xl:grid-cols-4">
          <CapabilityGroup title="代码已通过" items={completed} />
          <CapabilityGroup title="待生产验证" items={pendingValidation} />
          <CapabilityGroup title="内测中" items={beta} />
          <CapabilityGroup title="下一阶段" items={planned} />
        </div>
      </ShowcaseSection>

      <ShowcaseSection id="tech" eyebrow="技术实现" title="技术栈与部署边界" description="技术选型基于真实代码仓库和 CI；目标部署架构不等于已经完成生产部署。">
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

      <ShowcaseSection id="ai-demo" eyebrow="AI 状态" title="AI 生产验证状态" description="真实百炼密钥和模型调用尚待生产配置验证，因此本页不显示“可调用”。">
        <div className="mt-8">
          <AIDemoStatus
            status="demo_closed"
            message="AI 代理、权限与额度代码已通过自动测试；完成生产配置和真实调用验收后再开放比赛实时演示。"
          />
        </div>
      </ShowcaseSection>

      <ShowcaseSection id="progress" eyebrow="项目进度" title="代码完成、待生产验证、内测与下一阶段" description="进度来自发布配置和真实证据；可编辑比赛材料与访问记录由后台比赛中心管理。">
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

      <ShowcaseSection id="qa" eyebrow="答辩准备" title="评委常见问答" description="基于真实产品状态回答，不编造用户、支付、AI 或生产部署结果。">
        <div className="grid gap-4">
          {JUDGE_QA.map((qa, index) => (
            <div key={index} className="ui-surface p-5">
              <p className="text-sm font-bold text-[var(--ui-brand)]">Q：{qa.q}</p>
              <p className="ui-muted mt-3 text-sm leading-7">A：{qa.a}</p>
            </div>
          ))}
        </div>
      </ShowcaseSection>

      <div id="evidence">
        <EvidencePanel />
      </div>

      <section id="materials" className="scroll-mt-20 border-b border-[var(--ui-line)] bg-[var(--ui-page)] py-14 sm:py-16">
        <div className="ui-container">
          <p className="ui-eyebrow">比赛资料</p>
          <h2 className="ui-title mt-3 text-3xl leading-tight sm:text-4xl">比赛材料由后台真实文件状态决定</h2>
          <p className="ui-muted mt-4 leading-7">
            PPT、PDF、视频、截图和评委指南由超级管理员在“比赛中心”上传、替换和设为主文件。未上传材料不会在本页被标记为已提供。
          </p>
          <div className="mt-8 ui-surface p-8 text-center">
            <p className="text-sm font-bold text-[var(--ui-muted)]">
              当前公开页只说明材料管理边界；具体文件是否可下载，以后台比赛中心中的真实文件记录为准。
            </p>
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
          <div key={item.name} className="flex flex-col gap-2 p-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-sm">{item.name}</strong>
                <StatusBadge status={item.status} />
                {item.loginRequired ? <span className="rounded-full bg-[var(--ui-accent-soft)] px-2 py-0.5 text-[10px] font-black text-[#7D5B24]">需登录</span> : null}
              </div>
              <p className="ui-muted mt-1 text-sm leading-6">{item.note}</p>
            </div>
            {item.href ? (
              <Link href={item.href} target="_blank" className="ui-button-secondary min-h-9 self-start px-3 text-xs">
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
