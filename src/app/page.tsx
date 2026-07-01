import Link from "next/link";
import { ArrowRight, Check, CircleUserRound, ExternalLink, Link2, QrCode } from "lucide-react";
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
  { number: "01", title: "创建你的主页", description: "注册后设置头像、名称、简介和公开地址。", icon: CircleUserRound },
  { number: "02", title: "添加真实入口", description: "免费版也可以无限添加内容平台、网站、服务和联系方式。", icon: Link2 },
  { number: "03", title: "分享给客户", description: "复制公开链接，或使用二维码放到社交媒体和线下物料中。", icon: QrCode },
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
    description: "免费建立中英文无限链接主页",
    features: ["无限链接", "基础二维码与主题", "基础访问数据", "保留 Link168 品牌"],
    href: "/register",
    action: "免费创建",
  },
  {
    name: "Plus 会员",
    price: "188 元/年",
    description: "让主页拥有基础 AI 资料助理",
    features: ["基础访客 AI 助理", "基础资料交付", "更多主题", "隐藏品牌标识"],
    href: "/workbench/membership",
    action: "支付宝开通",
  },
  {
    name: "Pro 会员",
    price: "388 元/年",
    description: "面向创作者、销售和个体经营者",
    features: ["客户线索收集", "更多 AI 与文件额度", "高级访问数据", "数据导出"],
    href: "/workbench/membership",
    action: "支付宝开通",
    featured: true,
  },
  {
    name: "企业会员",
    price: "1288 元/年",
    description: "企业主页与高级 AI 客服顾问",
    features: ["企业资料", "独立域名名额", "高级 AI 客服", "最多 3 名成员"],
    href: "/workbench/membership",
    action: "支付宝开通",
  },
  {
    name: "企业专业 Plus",
    price: "3988 元/年",
    description: "多产品、多成员的企业 AI 工作空间",
    features: ["最多 10 名成员", "多知识空间", "多个域名名额", "企业优先服务"],
    href: "/workbench/membership",
    action: "支付宝开通",
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
              <p className="ui-eyebrow">个人与企业智能经营主页</p>
              <h1 className="ui-title mt-4 text-4xl leading-[1.12] sm:text-5xl lg:text-[56px]">用一个公开主页，<span className="block text-[var(--ui-brand)]">让客户快速找到你</span></h1>
              <p className="ui-muted mt-6 max-w-xl text-base leading-8 sm:text-lg">把内容平台、服务介绍、联系方式、文件和二维码整理到同一个页面。免费版即可无限添加链接，付费后再按需要开通 AI 与经营能力。</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="ui-button-primary min-h-12 px-6 text-base">免费创建主页<ArrowRight className="size-4" /></Link>
                <Link href="/login" className="ui-button-secondary min-h-12 px-6 text-base">登录管理后台</Link>
              </div>
              <div className="mt-8 grid gap-3 text-sm text-[var(--ui-muted)] sm:grid-cols-3">
                <span className="flex items-center gap-2"><Check className="size-4 text-[var(--ui-brand)]" />免费无限链接</span>
                <span className="flex items-center gap-2"><Check className="size-4 text-[var(--ui-brand)]" />中英文能力规划</span>
                <span className="flex items-center gap-2"><Check className="size-4 text-[var(--ui-brand)]" />支付宝在线开通</span>
              </div>
            </div>
            <div className="mx-auto w-full max-w-[350px]">
              <PhonePreview variant="marketing" poweredLogoClickable username="abao" displayName="阿宝的名片" bio="记录创业、分享服务，也让客户快速找到我" links={exampleLinks} />
            </div>
          </div>
        </section>

        <section id="features" className="py-14 sm:py-16">
          <div className="ui-container">
            <div className="max-w-2xl"><p className="ui-eyebrow">核心流程</p><h2 className="ui-title mt-3 text-3xl sm:text-4xl">从注册到分享，只需要三步</h2><p className="ui-muted mt-3 leading-7">不需要搭建复杂网站，先把最重要的信息和客户入口整理清楚。</p></div>
            <div className="ui-surface mt-8 divide-y divide-[var(--ui-line)] overflow-hidden">
              {workflow.map(({ number, title, description, icon: Icon }) => (
                <div key={number} className="grid gap-4 p-5 sm:grid-cols-[54px_48px_1fr] sm:items-center sm:p-6">
                  <span className="font-mono text-sm font-black text-[var(--ui-faint)]">{number}</span>
                  <span className="grid size-11 place-items-center rounded-[var(--ui-radius-sm)] bg-[var(--ui-brand-soft)] text-[var(--ui-brand)]"><Icon className="size-5" /></span>
                  <div><h3 className="font-black text-[var(--ui-ink)]">{title}</h3><p className="ui-muted mt-1 text-sm leading-6">{description}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="cases" className="border-y border-[var(--ui-line)] bg-[var(--ui-surface)] py-14 sm:py-16">
          <div className="ui-container grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
            <div><p className="ui-eyebrow">适用人群</p><h2 className="ui-title mt-3 text-3xl sm:text-4xl">适合需要被客户快速了解的人</h2><p className="ui-muted mt-4 max-w-md leading-7">公开主页可以放在社交媒体简介、聊天名片、线下海报和二维码中。</p></div>
            <div className="ui-surface-plain divide-y divide-[var(--ui-line)] overflow-hidden">
              {audiences.map(([title, description]) => <div key={title} className="grid gap-2 p-5 sm:grid-cols-[170px_1fr] sm:gap-6 sm:p-6"><h3 className="font-black text-[var(--ui-ink)]">{title}</h3><p className="ui-muted text-sm leading-6">{description}</p></div>)}
            </div>
          </div>
        </section>

        <section id="pricing" className="py-14 sm:py-16">
          <div className="ui-container">
            <div className="max-w-3xl"><p className="ui-eyebrow">五档收费方案</p><h2 className="ui-title mt-3 text-3xl sm:text-4xl">先免费使用，再按经营阶段升级</h2><p className="ui-muted mt-3 leading-7">当前在线收款仅支持支付宝，微信支付后续开放。付费套餐当前统一按年开通。</p></div>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {plans.map((plan) => (
                <article key={plan.name} className={`flex flex-col rounded-[var(--ui-radius-lg)] border border-[var(--ui-line)] p-5 shadow-[var(--ui-shadow-sm)] ${plan.featured ? "bg-[var(--ui-brand-soft)]" : "bg-[var(--ui-surface)]"}`}>
                  <div className="flex items-start justify-between gap-2"><div><h3 className="text-lg font-black text-[var(--ui-ink)]">{plan.name}</h3><p className="mt-2 text-2xl font-black text-[var(--ui-brand-hover)]">{plan.price}</p></div>{plan.featured ? <span className="rounded-full bg-[var(--ui-brand)] px-3 py-1 text-xs font-black text-white">推荐</span> : null}</div>
                  <p className="ui-muted mt-3 min-h-16 text-sm leading-6">{plan.description}</p>
                  <ul className="mt-5 grid gap-3 text-sm">{plan.features.map((feature) => <li key={feature} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-[var(--ui-brand)]" /><span>{feature}</span></li>)}</ul>
                  <Link href={plan.href} className={`${plan.featured ? "ui-button-primary" : "ui-button-secondary"} mt-auto w-full pt-6`}>{plan.action}</Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="help" className="border-t border-[var(--ui-line)] bg-[var(--ui-surface)] py-14">
          <div className="ui-container flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl"><p className="ui-eyebrow">现在开始</p><h2 className="ui-title mt-3 text-3xl">创建你的真实公开主页</h2><p className="ui-muted mt-3 leading-7">注册后填写资料、无限添加链接并分享公开地址。无需下载安装其他软件。</p></div>
            <div className="flex flex-col gap-3 sm:flex-row"><Link href="/register" className="ui-button-primary min-h-12 px-6">免费创建<ArrowRight className="size-4" /></Link><Link href="/help" className="ui-button-secondary min-h-12 px-6">查看帮助<ExternalLink className="size-4" /></Link></div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
