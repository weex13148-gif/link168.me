import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  MessageSquare,
  MonitorSmartphone,
  PlayCircle,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { HomeHandleForm } from "@/components/HomeHandleForm";
import { PhonePreview } from "@/components/PhonePreview";
import { SiteFooter } from "@/components/SiteFooter";

const phoneLinks = [
  { id: "brand", label: "你的品牌", caption: "个人品牌展示" },
  { id: "service", label: "客服咨询", caption: "一对一沟通" },
  { id: "product", label: "产品介绍", caption: "商品橱窗" },
  { id: "contact", label: "联系方式", caption: "快速联系" },
  { id: "booking", label: "预约咨询", caption: "预约时间" },
];

const fourCapabilities: Array<{ title: string; desc: string; icon: LucideIcon }> = [
  {
    title: "简单易用",
    desc: "3分钟创建你的专属主页",
    icon: Zap,
  },
  {
    title: "智能 AI",
    desc: "24/7 自动回复客户咨询",
    icon: Bot,
  },
  {
    title: "数据统计",
    desc: "实时掌握访客与咨询情况",
    icon: BarChart3,
  },
  {
    title: "安全可靠",
    desc: "企业级安全、稳定运行",
    icon: Shield,
  },
];

const useCases = [
  { name: "创作者", desc: "链接聚合 + AI 回复", initials: "创" },
  { name: "商家", desc: "商品展示 + 咨询转化", initials: "商" },
  { name: "个人品牌", desc: "品牌主页 + 粉丝运营", initials: "品" },
];

export default function Home() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-white text-[#1f1f2e]">
      <AppHeader />
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pt-20 lg:px-8 lg:pb-24">
          {/* Background gradients */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-white via-[#f5f3ff] to-[#dbeafe]" />
            <div className="absolute -left-20 top-20 size-[400px] rounded-full bg-[#8b5cf6]/10 blur-[100px]" />
            <div className="absolute -right-20 top-40 size-[350px] rounded-full bg-[#3b82f6]/10 blur-[80px]" />
            <div className="absolute bottom-0 left-1/2 size-[500px] -translate-x-1/2 rounded-full bg-[#8b5cf6]/5 blur-[120px]" />
          </div>

          <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16 lg:items-center">
            {/* Left content */}
            <div className="max-w-3xl">
              {/* AI badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#8b5cf6]/20 bg-[#8b5cf6]/8 px-4 py-2 text-sm font-semibold text-[#6d28d9]">
                <span className="text-base">🔥</span>
                新功能&nbsp;&nbsp;Link168 AI 经营助手全新上线
              </div>

              {/* Main headline */}
              <h1 className="text-[36px] font-black leading-[1.1] tracking-tight sm:text-[48px] lg:text-[56px]">
                <span className="block">一个链接承接客户</span>
                <span className="mt-2 block bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] bg-clip-text text-transparent">
                  一个 AI 帮你继续经营
                </span>
              </h1>

              {/* Subtitle */}
              <p className="mt-6 max-w-xl text-base leading-7 text-[#6b7280] sm:text-lg sm:leading-8">
                在社交媒体、直播、名片、广告中分享你的 Link168 主页
                <br className="hidden sm:block" />
                客户点击链接，AI 自动聊起来，帮你留住每一次机会。
              </p>

              {/* CTA buttons */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/register"
                  className="link168-button-press inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#8b5cf6] px-8 font-bold text-white shadow-xl shadow-[#8b5cf6]/30 transition hover:-translate-y-0.5 hover:bg-[#7c3aed] sm:min-h-14 sm:px-10"
                >
                  免费创建主页
                  <ArrowRight aria-hidden className="size-5" />
                </Link>
                <button
                  type="button"
                  className="link168-button-press inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-8 font-bold text-[#1f1f2e] shadow-sm transition hover:-translate-y-0.5 hover:border-[#8b5cf6]/30 hover:bg-[#f5f3ff] sm:min-h-14 sm:px-10"
                >
                  <PlayCircle aria-hidden className="size-5 text-[#8b5cf6]" />
                  观看演示
                </button>
              </div>

              {/* Social proof */}
              <div className="mt-8 flex items-center gap-2 text-sm text-[#6b7280]">
                <CheckCircle2 aria-hidden className="size-5 text-[#8b5cf6]" />
                <span>免费注册，即刻拥有你的专属主页</span>
              </div>
            </div>

            {/* Right: Phone preview */}
            <div className="relative mx-auto w-full max-w-[320px] sm:max-w-[340px] lg:max-w-[380px]">
              {/* Stats bar */}
              <div className="absolute -top-4 left-1/2 z-20 flex -translate-x-1/2 gap-3 rounded-full border border-[#e5e7eb] bg-white px-4 py-2 shadow-lg">
                <div className="flex items-center gap-1.5">
                  <div className="size-2 rounded-full bg-[#8b5cf6]" />
                  <span className="text-xs font-semibold text-[#1f1f2e]">访问 1.2k</span>
                </div>
                <div className="h-4 w-px bg-[#e5e7eb]" />
                <div className="flex items-center gap-1.5">
                  <div className="size-2 rounded-full bg-[#3b82f6]" />
                  <span className="text-xs font-semibold text-[#1f1f2e]">点击 86</span>
                </div>
                <div className="h-4 w-px bg-[#e5e7eb]" />
                <div className="flex items-center gap-1.5">
                  <div className="size-2 rounded-full bg-[#10b981]" />
                  <span className="text-xs font-semibold text-[#1f1f2e]">咨询 12</span>
                </div>
              </div>

              <PhonePreview
                variant="marketing"
                poweredLogoClickable
                username="yourname"
                displayName="你的品牌"
                bio="专注服务，品质保证"
                links={phoneLinks}
                className="max-w-[320px] sm:max-w-[340px] lg:max-w-[380px]"
              />
            </div>
          </div>
        </section>

        {/* Four capabilities */}
        <section className="bg-gradient-to-b from-[#f5f3ff]/50 to-white px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {fourCapabilities.map(({ title, desc, icon: Icon }) => (
              <div
                key={title}
                className="link168-card-hover flex flex-col items-center gap-3 rounded-2xl border border-[#e5e7eb] bg-white p-6 text-center shadow-sm"
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-[#8b5cf6]/10">
                  <Icon aria-hidden className="size-6 text-[#8b5cf6]" />
                </div>
                <h3 className="text-base font-bold text-[#1f1f2e]">{title}</h3>
                <p className="text-sm text-[#6b7280]">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features section */}
        <section id="features" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <div className="mb-12 text-center">
              <h2 className="text-[28px] font-black text-[#1f1f2e] sm:text-[36px]">
                为什么选择 Link168
              </h2>
              <p className="mt-3 text-base text-[#6b7280] sm:text-lg">
                一站式解决客户入口分散问题
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
              <div className="link168-card-hover rounded-2xl border border-[#e5e7eb] bg-gradient-to-br from-[#f5f3ff] to-white p-8 shadow-sm">
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-[#8b5cf6]">
                  <LinkIcon className="size-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#1f1f2e]">链接聚合</h3>
                <p className="mt-3 text-sm leading-6 text-[#6b7280]">
                  将微信、微博、小红书、抖音等平台链接汇聚在一个页面，客户一键直达。
                </p>
              </div>

              <div className="link168-card-hover rounded-2xl border border-[#e5e7eb] bg-gradient-to-br from-[#dbeafe] to-white p-8 shadow-sm">
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-[#3b82f6]">
                  <Bot className="size-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#1f1f2e]">AI 智能回复</h3>
                <p className="mt-3 text-sm leading-6 text-[#6b7280]">
                  基于你的资料自动回答客户问题，24小时在线，不错过任何商机。
                </p>
              </div>

              <div className="link168-card-hover rounded-2xl border border-[#e5e7eb] bg-gradient-to-br from-[#d1fae5] to-white p-8 shadow-sm">
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-[#10b981]">
                  <BarChart3 className="size-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#1f1f2e]">数据洞察</h3>
                <p className="mt-3 text-sm leading-6 text-[#6b7280]">
                  实时了解访客来源、点击热点，帮你优化营销策略，提升转化率。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section id="cases" className="bg-[#f9fafb] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <div className="mb-12 text-center">
              <h2 className="text-[28px] font-black text-[#1f1f2e] sm:text-[36px]">
                适用多种场景
              </h2>
              <p className="mt-3 text-base text-[#6b7280] sm:text-lg">
                无论你是创作者、商家还是个人品牌
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              {useCases.map((item) => (
                <div
                  key={item.name}
                  className="link168-card-hover rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#3b82f6] text-xl font-black text-white shadow-lg shadow-[#8b5cf6]/20">
                      {item.initials}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#1f1f2e]">{item.name}</h3>
                      <p className="text-sm text-[#6b7280]">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Link
                href="/register"
                className="link168-button-press inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#8b5cf6] px-10 font-bold text-white shadow-xl shadow-[#8b5cf6]/30 transition hover:-translate-y-0.5 hover:bg-[#7c3aed] sm:min-h-14"
              >
                免费创建我的 Link168
                <ArrowRight aria-hidden className="size-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* CTA section */}
        <section id="help" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-4xl">
            <div className="relative overflow-hidden rounded-3xl border border-[#e5e7eb] bg-gradient-to-br from-[#f5f3ff] via-white to-[#dbeafe] p-8 shadow-xl sm:p-12">
              <div className="absolute -right-10 -top-10 size-40 rounded-full bg-[#8b5cf6]/10 blur-[60px]" />
              <div className="absolute -bottom-10 -left-10 size-40 rounded-full bg-[#3b82f6]/10 blur-[60px]" />

              <div className="relative z-10 text-center">
                <h2 className="text-[28px] font-black text-[#1f1f2e] sm:text-[36px]">
                  立即开始，让客户轻松找到你
                </h2>
                <p className="mt-4 text-base text-[#6b7280] sm:text-lg">
                  3分钟创建专属主页，开启智能经营之旅
                </p>
                <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                  <Link
                    href="/register"
                    className="link168-button-press inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#8b5cf6] px-8 font-bold text-white shadow-xl shadow-[#8b5cf6]/30 transition hover:-translate-y-0.5 hover:bg-[#7c3aed] sm:min-h-14"
                  >
                    免费创建主页
                    <ArrowRight aria-hidden className="size-5" />
                  </Link>
                  <Link
                    href="/help"
                    className="link168-button-press inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-8 font-bold text-[#6b7280] transition hover:-translate-y-0.5 hover:text-[#8b5cf6] sm:min-h-14"
                  >
                    <MessageSquare aria-hidden className="size-5" />
                    联系我们
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
