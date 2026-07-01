import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleUserRound,
  ExternalLink,
  Link2,
  QrCode,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { PhonePreview, type PhonePreviewLink } from "@/components/PhonePreview";
import { SiteFooter } from "@/components/SiteFooter";

const exampleLinks: PhonePreviewLink[] = [
  { id: "service", label: "AI 网站开发服务", caption: "查看服务内容和合作方式" },
  { id: "douyin", label: "阿宝的创业笔记", caption: "记录一个人用 AI 做产品" },
  { id: "wechat", label: "微信公众号", caption: "文章、案例和项目动态" },
  { id: "contact", label: "商务合作", caption: "项目咨询与合作联系" },
];

const workflow = [
  {
    number: "01",
    title: "创建你的主页",
    description: "注册后设置头像、名称、简介和公开地址。",
    icon: CircleUserRound,
  },
  {
    number: "02",
    title: "添加真实入口",
    description: "整理内容平台、网站、服务和联系方式。",
    icon: Link2,
  },
  {
    number: "03",
    title: "分享给客户",
    description: "复制公开链接，或使用二维码放到社交媒体和物料中。",
    icon: QrCode,
  },
];

const audiences = [
  ["内容创作者", "集中展示抖音、小红书、公众号、作品和商务合作入口。"],
  ["顾问与自由职业者", "让客户快速了解你的服务、案例和联系方式。"],
  ["个体商家与创业者", "把门店、产品、咨询和社群入口整理到同一个页面。"],
];

const plans = [
  {
    name: "免费版",
    price: "0 元",
    description: "完成个人主页和基础分享闭环",
    features: ["公开主页", "基础链接管理", "二维码分享", "Link168 品牌标识"],
    action: "免费创建",
    href: "/register",
    featured: false,
  },
  {
    name: "会员版",
    price: "188 元 / 年",
    description: "适合持续经营个人品牌的用户",
    features: ["更多链接与高级主题", "访问数据", "高级二维码", "隐藏部分平台品牌"],
    action: "先免费体验",
    href: "/register",
    featured: true,
  },
  {
    name: "企业版",
    price: "联系开通",
    description: "适合团队、企业资料和 AI 服务场景",
    features: ["企业资料库", "AI 助手", "团队服务", "更高使用额度"],
    action: "查看企业服务",
    href: "/enterprise-ai",
    featured: false,
  },
];

export default function Home() {
  return (
    <div className="ui-page">
      <AppHeader />

      <main>
        <section className="border-b border-[var(--ui-line)] bg-[var(--ui-surface)] py-12 sm:py-16 lg:py-20">
          <div className="ui-container grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_370px] lg:gap-16">
            <div className="max-w-2xl">
              <p className="ui-eyebrow">个人数字名片与客户入口</p>
              <h1 className="ui-title mt-4 text-4xl leading-[1.12] sm:text-5xl lg:text-[56px]">
                用一个公开主页，
                <span className="block text-[var(--ui-brand)]">让客户快速找到你</span>
              </h1>
              <p className="ui-muted mt-6 max-w-xl text-base leading-8 sm:text-lg">
                把内容平台、服务介绍、联系方式和二维码整理到同一个页面。客户从任何渠道看到你，都可以通过一个链接直达真实入口。
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="ui-button-primary min-h-12 px-6 text-base">
                  免费创建主页
                  <ArrowRight className="size-4" />
                </Link>
                <Link href="/login" className="ui-button-secondary min-h-12 px-6 text-base">
                  登录管理后台
                </Link>
              </div>

              <div className="mt-8 grid gap-3 text-sm text-[var(--ui-muted)] sm:grid-cols-3">
                <span className="flex items-center gap-2"><Check className="size-4 text-[var(--ui-brand)]" />免费注册</span>
                <span className="flex items-center gap-2"><Check className="size-4 text-[var(--ui-brand)]" />真实公开地址</span>
                <span className="flex items-center gap-2"><Check className="size-4 text-[var(--ui-brand)]" />链接直接跳转</span>
              </div>
            </div>

            <div className="mx-auto w-full max-w-[350px]">
              <PhonePreview
                variant="marketing"
                poweredLogoClickable
                username="abao"
                displayName="阿宝的名片"
                bio="记录创业、分享服务，也让客户快速找到我"
                links={exampleLinks}
              />
            </div>
          </div>
        </section>

        <section id="features" className="py-14 sm:py-16">
          <div className="ui-container">
            <div className="max-w-2xl">
              <p className="ui-eyebrow">核心流程</p>
              <h2 className="ui-title mt-3 text-3xl sm:text-4xl">从注册到分享，只需要三步</h2>
              <p className="ui-muted mt-3 leading-7">不需要搭建复杂网站，先把最重要的信息和客户入口整理清楚。</p>
            </div>

            <div className="ui-surface mt-8 divide-y divide-[var(--ui-line)] overflow-hidden">
              {workflow.map(({ number, title, description, icon: Icon }) => (
                <div key={number} className="grid gap-4 p-5 sm:grid-cols-[54px_48px_1fr] sm:items-center sm:p-6">
                  <span className="font-mono text-sm font-black text-[var(--ui-faint)]">{number}</span>
                  <span className="grid size-11 place-items-center rounded-[var(--ui-radius-sm)] bg-[var(--ui-brand-soft)] text-[var(--ui-brand)]">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-black text-[var(--ui-ink)]">{title}</h3>
                    <p className="ui-muted mt-1 text-sm leading-6">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="cases" className="border-y border-[var(--ui-line)] bg-[var(--ui-surface)] py-14 sm:py-16">
          <div className="ui-container grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
            <div>
              <p className="ui-eyebrow">适用人群</p>
              <h2 className="ui-title mt-3 text-3xl sm:text-4xl">适合需要被客户快速了解的人</h2>
              <p className="ui-muted mt-4 max-w-md leading-7">公开主页可以放在社交媒体简介、聊天名片、线下海报和二维码中。</p>
            </div>

            <div className="ui-surface-plain divide-y divide-[var(--ui-line)] overflow-hidden">
              {audiences.map(([title, description]) => (
                <div key={title} className="grid gap-2 p-5 sm:grid-cols-[170px_1fr] sm:gap-6 sm:p-6">
                  <h3 className="font-black text-[var(--ui-ink)]">{title}</h3>
                  <p className="ui-muted text-sm leading-6">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="py-14 sm:py-16">
          <div className="ui-container">
            <div className="max-w-2xl">
              <p className="ui-eyebrow">版本与能力</p>
              <h2 className="ui-title mt-3 text-3xl sm:text-4xl">先免费使用，再按经营需要升级</h2>
              <p className="ui-muted mt-3 leading-7">核心主页和链接功能可以免费使用，会员与企业能力按实际需要开通。</p>
            </div>

            <div className="mt-8 overflow-x-auto rounded-[var(--ui-radius-lg)] border border-[var(--ui-line)] bg-[var(--ui-surface)] shadow-[var(--ui-shadow-sm)]">
              <div className="grid min-w-[850px] grid-cols-3 divide-x divide-[var(--ui-line)]">
                {plans.map((plan) => (
                  <article key={plan.name} className={`p-6 ${plan.featured ? "bg-[var(--ui-brand-soft)]" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black text-[var(--ui-ink)]">{plan.name}</h3>
                        <p className="mt-2 text-2xl font-black text-[var(--ui-brand-hover)]">{plan.price}</p>
                      </div>
                      {plan.featured ? <span className="rounded-full bg-[var(--ui-brand)] px-3 py-1 text-xs font-black text-white">推荐</span> : null}
                    </div>
                    <p className="ui-muted mt-3 min-h-12 text-sm leading-6">{plan.description}</p>
                    <ul className="mt-5 grid gap-3 text-sm">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <Check className="mt-0.5 size-4 shrink-0 text-[var(--ui-brand)]" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href={plan.href} className={plan.featured ? "ui-button-primary mt-6 w-full" : "ui-button-secondary mt-6 w-full"}>
                      {plan.action}
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="help" className="border-t border-[var(--ui-line)] bg-[var(--ui-surface)] py-14">
          <div className="ui-container flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="ui-eyebrow">现在开始</p>
              <h2 className="ui-title mt-3 text-3xl">创建你的真实公开主页</h2>
              <p className="ui-muted mt-3 leading-7">注册后填写资料、添加链接并分享公开地址。无需下载安装其他软件。</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="ui-button-primary min-h-12 px-6">
                免费创建
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/help" className="ui-button-secondary min-h-12 px-6">
                查看帮助
                <ExternalLink className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
