import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  LayoutGrid,
  Link2,
  QrCode,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { PhonePreview, type PhonePreviewLink } from "@/components/PhonePreview";
import { SiteFooter } from "@/components/SiteFooter";

const exampleLinks: PhonePreviewLink[] = [
  { id: "service", label: "AI 网站开发服务", caption: "了解服务内容和合作方式" },
  { id: "douyin", label: "阿宝的创业笔记", caption: "记录一个人用 AI 做产品" },
  { id: "wechat", label: "微信公众号", caption: "文章、案例和项目动态" },
  { id: "contact", label: "商务合作", caption: "咨询项目或发起合作" },
];

const productPoints = [
  {
    icon: UserRound,
    title: "一张公开数字名片",
    description: "展示头像、名称、简介和你的专属公开主页地址。",
  },
  {
    icon: Link2,
    title: "集中整理客户入口",
    description: "把内容平台、网站、服务和联系方式放到同一个页面。",
  },
  {
    icon: QrCode,
    title: "链接与二维码分享",
    description: "将主页用于社交媒体、线下名片、海报和客户沟通。",
  },
  {
    icon: Smartphone,
    title: "边编辑边实时预览",
    description: "在后台修改资料和链接，同时查看手机端展示效果。",
  },
];

const scenarios = [
  {
    title: "内容创作者",
    description: "集中展示抖音、小红书、公众号、作品和合作入口。",
  },
  {
    title: "个体商家与顾问",
    description: "把服务介绍、预约咨询、门店信息和联系方式放在一个主页。",
  },
  {
    title: "个人品牌与创业者",
    description: "用统一公开地址承接不同平台来的客户和合作机会。",
  },
];

export default function Home() {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-white text-[#1f1f2e]">
      <AppHeader />

      <main>
        <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pt-20 lg:px-8 lg:pb-24">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_18%,rgba(139,92,246,0.12),transparent_28%),radial-gradient(circle_at_84%_22%,rgba(59,130,246,0.10),transparent_25%),linear-gradient(135deg,#ffffff_0%,#f7f5ff_55%,#eef6ff_100%)]" />

          <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-16">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-[#8b5cf6]/20 bg-white/80 px-4 py-2 text-sm font-bold text-[#6d28d9] shadow-sm">
                <LayoutGrid className="size-4" />
                个人数字名片 · 公开主页 · 客户入口整理
              </p>

              <h1 className="mt-6 text-[38px] font-black leading-[1.08] tracking-tight sm:text-[52px] lg:text-[62px]">
                用一个公开主页
                <span className="mt-2 block bg-gradient-to-r from-[#7c3aed] to-[#2563eb] bg-clip-text text-transparent">
                  让客户快速找到你
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-[#5f6673] sm:text-lg">
                Link168 帮你创建个人数字名片，把内容平台、服务介绍、联系方式和二维码整理到同一个页面。
                无论客户从哪里看到你，都能通过一个链接直达你的真实入口。
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href="/register" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[#7c3aed] px-8 font-black text-white shadow-xl shadow-[#7c3aed]/25 transition hover:-translate-y-0.5 hover:bg-[#6d28d9]">
                  免费创建我的主页
                  <ArrowRight className="size-5" />
                </Link>
                <Link href="/login" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-[#dfe3ea] bg-white px-8 font-black text-[#252836] shadow-sm transition hover:border-[#8b5cf6]/30 hover:bg-[#f8f6ff]">
                  登录管理后台
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#5f6673]">
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-[#16a34a]" />免费注册</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-[#16a34a]" />真实公开地址</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-[#16a34a]" />链接直接跳转</span>
              </div>
            </div>

            <div className="mx-auto w-full max-w-[360px]">
              <PhonePreview
                variant="marketing"
                poweredLogoClickable
                username="abao"
                displayName="阿宝的名片"
                bio="记录创业、分享服务，也让客户快速找到我"
                links={exampleLinks}
                className="max-w-[360px]"
              />
            </div>
          </div>
        </section>

        <section className="border-y border-[#edf0f4] bg-[#fafbfc] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-sm font-black text-[#7c3aed]">核心功能</p>
              <h2 className="mt-2 text-3xl font-black sm:text-4xl">先把最重要的信息整理清楚</h2>
              <p className="mt-3 text-base leading-7 text-[#666d79]">不需要复杂建站，注册后即可编辑主页资料、添加链接并分享公开地址。</p>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {productPoints.map(({ icon: Icon, title, description }) => (
                <article key={title} className="rounded-3xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
                  <span className="grid size-12 place-items-center rounded-2xl bg-[#f1edff] text-[#7c3aed]">
                    <Icon className="size-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-black">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#69717d]">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-sm font-black text-[#2563eb]">使用场景</p>
              <h2 className="mt-2 text-3xl font-black sm:text-4xl">适合需要被客户快速了解的人</h2>
              <p className="mt-4 text-base leading-7 text-[#69717d]">你的公开主页可以放在社交媒体简介、聊天名片、线下海报和二维码中。</p>
              <Link href="/register" className="mt-7 inline-flex items-center gap-2 font-black text-[#7c3aed]">
                现在创建
                <ExternalLink className="size-4" />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {scenarios.map((item) => (
                <article key={item.title} className="rounded-3xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-black">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#69717d]">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-6 rounded-[32px] bg-[#1f2440] p-8 text-white sm:p-10 lg:flex-row lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-sm font-black text-[#c4b5fd]"><ShieldCheck className="size-4" />Link168 V1</div>
              <h2 className="mt-3 text-3xl font-black">创建你的真实公开主页</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">从填写资料、添加链接到公开分享，先完成一条简单可信的客户入口闭环。</p>
            </div>
            <Link href="/register" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-7 font-black text-[#312e81]">
              免费开始
              <ArrowRight className="size-5" />
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
