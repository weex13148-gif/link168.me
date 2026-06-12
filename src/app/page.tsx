import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpenText,
  CalendarCheck,
  Globe2,
  Link2,
  MessageCircle,
  QrCode,
  Sparkles,
  Store,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";

const previewLinks: Array<[string, LucideIcon]> = [
  ["微信公众号", MessageCircle],
  ["小红书", BookOpenText],
  ["抖音", Video],
  ["视频号", Sparkles],
  ["我的网站", Globe2],
  ["商品橱窗", Store],
];

const features: Array<{ title: string; text: string; icon: LucideIcon }> = [
  {
    title: "一个链接",
    text: "把公众号、小红书、抖音、视频号、网站和商品入口收进同一个主页。",
    icon: Link2,
  },
  {
    title: "专属主页",
    text: "用昵称、简介、头像和品牌色，快速搭好你的个人数字名片。",
    icon: BadgeCheck,
  },
  {
    title: "高效传播",
    text: "链接和二维码都适合放在海报、社群、短视频主页和线下物料。",
    icon: QrCode,
  },
  {
    title: "数据统计",
    text: "为后续访问和点击分析预留清晰路径，了解客户真正关心什么。",
    icon: BarChart3,
  },
];

const platforms = ["微信公众号", "小红书", "抖音", "视频号", "网站链接", "商品链接", "预约咨询", "更多内容"];

const cases = ["自媒体主理人", "本地生活商家", "知识博主", "私域顾问", "设计师", "小店店主"];

function HeroPhonePreview() {
  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      <div className="absolute -left-5 top-10 hidden rounded-2xl bg-[#FACC15] px-4 py-3 text-sm font-black text-[#113A1D] shadow-xl shadow-[#FACC15]/30 sm:block">
        链接一路发
      </div>
      <div className="absolute -right-4 bottom-16 hidden rounded-full border border-white/70 bg-white px-4 py-2 text-xs font-black text-[#0B6B2B] shadow-xl sm:block">
        link168.me/yourname
      </div>
      <div className="rounded-[34px] border border-[#0B6B2B]/20 bg-[#123B20] p-3 shadow-[0_30px_90px_rgba(11,107,43,0.32)]">
        <div className="overflow-hidden rounded-[26px] bg-[linear-gradient(180deg,#F2FBEF,#FFF8D7_55%,#FFFFFF)]">
          <div className="flex items-center justify-between px-5 py-3 text-xs font-black text-[#14532D]">
            <span>9:41</span>
            <span className="h-1.5 w-20 rounded-full bg-[#14532D]/20" />
            <span>5G</span>
          </div>
          <div className="px-5 pb-6 pt-4">
            <section className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-[#FACC15] ring-4 ring-[#16A34A]/15">
                  <Image src="/brand/link168-logo.png" alt="Link168 链接一路发" width={80} height={45} className="h-auto w-14 object-contain" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-black text-[#113A1D]">Link168 名片</h2>
                  <p className="mt-1 text-xs font-bold text-[#0B6B2B]">@yourname</p>
                  <p className="mt-2 text-sm leading-5 text-[#3F4D35]">一个人，一个链接，连接全网。</p>
                </div>
              </div>
            </section>

            <div className="mt-4 grid gap-2.5">
              {previewLinks.map(([label, Icon]) => (
                <a
                  key={label}
                  href="#features"
                  className="flex min-h-14 items-center justify-between rounded-2xl border border-[#E4E8D4] bg-white px-3.5 text-sm font-black text-[#113A1D] shadow-sm"
                >
                  <span className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-[#ECFDF3] text-[#16A34A]">
                      <Icon aria-hidden className="size-4" />
                    </span>
                    {label}
                  </span>
                  <ArrowRight aria-hidden className="size-4 text-[#F6C343]" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#F7F6EA] text-[#113A1D]">
      <AppHeader />
      <main>
        <section className="relative overflow-hidden px-4 pb-16 pt-8 sm:px-6 lg:px-8">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(250,204,21,0.28),transparent_28%),linear-gradient(135deg,#E8F8E8_0%,#FFFBE6_45%,#DFF5DF_100%)]" />
          <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#16A34A]/20 bg-white/80 px-4 py-2 text-sm font-black text-[#0B6B2B] shadow-sm">
                <Sparkles aria-hidden className="size-4 text-[#F6C343]" />
                Link168 链接一路发
              </div>
              <h1 className="mt-6 text-5xl font-black leading-tight text-[#0B3D1C] sm:text-6xl lg:text-7xl">
                Link168
                <span className="block text-[#0B6B2B]">链接一路发</span>
                <span className="block text-3xl text-[#113A1D] sm:text-4xl lg:text-5xl">一个人，一个链接，连接全网</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[#3F4D35] sm:text-lg">
                聚合微信公众号、小红书、抖音、视频号、网站链接、商品橱窗，让客户只记住你的一个主页。
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#FACC15,#F6C343)] px-7 font-black text-[#113A1D] shadow-xl shadow-[#FACC15]/30 transition hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  立即创建你的 Link168
                  <ArrowRight aria-hidden className="size-5" />
                </Link>
                <a
                  href="#cases"
                  className="inline-flex min-h-13 items-center justify-center rounded-full border border-[#16A34A]/30 bg-white/90 px-7 font-black text-[#0B6B2B] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#ECFDF3] active:scale-[0.98]"
                >
                  查看案例
                </a>
              </div>
              <div className="mt-7 flex w-full max-w-md items-center gap-2 rounded-full border border-[#16A34A]/20 bg-white px-4 py-3 shadow-sm">
                <span className="text-sm font-black text-[#0B6B2B]">link168.me/</span>
                <span className="text-sm font-semibold text-[#7A7F62]">你的名字</span>
              </div>
              <div className="mt-6 grid gap-2 text-sm font-black text-[#14532D] sm:grid-cols-2">
                {["一个页面，展示全部", "一个链接，连接全网", "分享给各平台主页、视频、文章末尾、群聊和名片二维码", "让流量价值翻倍，只要一分钟"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <BadgeCheck aria-hidden className="size-4 text-[#16A34A]" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <HeroPhonePreview />
          </div>
        </section>

        <section id="features" className="bg-white px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-sm font-black text-[#0B6B2B]">核心功能</p>
              <h2 className="mt-3 text-3xl font-black text-[#113A1D] sm:text-4xl">把所有入口收进一张数字名片</h2>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ title, text, icon: Icon }) => (
                <article key={title} className="rounded-2xl border border-[#E4E8D4] bg-[#FCFFF7] p-5 shadow-sm">
                  <div className="grid size-11 place-items-center rounded-2xl bg-[#ECFDF3] text-[#16A34A]">
                    <Icon aria-hidden className="size-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-black text-[#113A1D]">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#52624A]">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#F7F6EA] px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-black text-[#0B6B2B]">平台支持</p>
              <h2 className="mt-3 text-3xl font-black text-[#113A1D] sm:text-4xl">客户常去哪里，你的 Link168 就连到哪里</h2>
              <p className="mt-4 text-sm leading-7 text-[#52624A]">
                适合创作者、商家、顾问、门店和自由职业者，把分散在不同平台的内容聚合成一个清楚的行动入口。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {platforms.map((item) => (
                <span key={item} className="rounded-full border border-[#16A34A]/15 bg-white px-4 py-3 text-center text-sm font-black text-[#14532D] shadow-sm">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="cases" className="bg-white px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-black text-[#0B6B2B]">精选案例</p>
                <h2 className="mt-3 text-3xl font-black text-[#113A1D] sm:text-4xl">他们正在使用 Link168</h2>
              </div>
              <Link href="/register" className="inline-flex w-fit items-center gap-2 rounded-full bg-[#ECFDF3] px-5 py-3 text-sm font-black text-[#0B6B2B]">
                立即创建
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cases.map((item, index) => (
                <article key={item} className="flex items-center gap-4 rounded-2xl border border-[#E4E8D4] bg-[#FCFFF7] p-4 shadow-sm">
                  <div className="grid size-14 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#16A34A,#FACC15)] text-lg font-black text-white">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-black text-[#113A1D]">{item}</h3>
                    <p className="mt-1 text-sm text-[#52624A]">用一个主页承接内容、咨询和转化。</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="help" className="bg-[#0B3D1C] px-4 py-14 text-white sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-[#FACC15]">开始你的主页</p>
              <h2 className="mt-3 text-3xl font-black">三分钟，把客户入口整理清楚</h2>
            </div>
            <Link
              href="/register"
              className="inline-flex min-h-12 w-fit items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#FACC15,#F6C343)] px-6 font-black text-[#113A1D] shadow-xl shadow-black/20"
            >
              免费注册
              <CalendarCheck aria-hidden className="size-5" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
