import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpenText,
  CalendarCheck,
  ChartNoAxesCombined,
  CheckCircle2,
  Globe2,
  Link2,
  MessageCircle,
  MonitorSmartphone,
  QrCode,
  Share2,
  ShoppingBag,
  Sparkles,
  Store,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { HomeHandleForm } from "@/components/HomeHandleForm";
import { PhonePreview } from "@/components/PhonePreview";
import { SiteFooter } from "@/components/SiteFooter";

const phoneLinks = [
  { id: "wechat", label: "微信公众号", caption: "最新文章和观点" },
  { id: "rednote", label: "小红书", caption: "生活方式和灵感" },
  { id: "douyin", label: "抖音", caption: "短视频内容合集" },
  { id: "channels", label: "视频号", caption: "直播和视频动态" },
  { id: "site", label: "我的网站", caption: "作品、服务和介绍" },
  { id: "shop", label: "商品橱窗", caption: "精选商品入口" },
  { id: "booking", label: "预约咨询", caption: "快速预约时间" },
  { id: "service", label: "微信客服", caption: "一对一沟通" },
  { id: "email", label: "官方邮箱", caption: "商务合作联系" },
];

const floatingPlatforms: Array<{ label: string; icon: LucideIcon; className: string }> = [
  { label: "微信", icon: MessageCircle, className: "left-0 top-16 bg-[#DDE8CD] text-[#3F5F31]" },
  { label: "小红书", icon: BookOpenText, className: "-right-4 top-28 bg-[#F2E7D8] text-[#C9824B]" },
  { label: "抖音", icon: Video, className: "left-2 bottom-28 bg-[#2B241E] text-[#FFFDF8]" },
  { label: "网站", icon: Globe2, className: "-right-3 bottom-40 bg-[#FFFDF8] text-[#3F5F31]" },
  { label: "商品", icon: ShoppingBag, className: "right-12 bottom-8 bg-[#F6E7C8] text-[#8C612E]" },
];

const features: Array<{ title: string; text: string; icon: LucideIcon; accent: string }> = [
  {
    title: "一个链接",
    text: "把内容、商品、咨询和联系方式收进一个入口。",
    icon: Link2,
    accent: "from-[#6F8F4E] to-[#DDE8CD]",
  },
  {
    title: "专属主页",
    text: "用头像、简介和链接，搭好你的数字名片。",
    icon: MonitorSmartphone,
    accent: "from-[#C8A45D] to-[#F6E7C8]",
  },
  {
    title: "高效传播",
    text: "适合放进主页、海报、社群、视频和文章末尾。",
    icon: Share2,
    accent: "from-[#3F5F31] to-[#DDE8CD]",
  },
  {
    title: "数据统计",
    text: "为后续访问分析和点击洞察预留清晰路径。",
    icon: BarChart3,
    accent: "from-[#C9824B] to-[#F2E7D8]",
  },
];

const platforms: Array<{ label: string; icon: LucideIcon }> = [
  { label: "微信公众号", icon: MessageCircle },
  { label: "小红书", icon: BookOpenText },
  { label: "抖音", icon: Video },
  { label: "视频号", icon: Sparkles },
  { label: "网站链接", icon: Globe2 },
  { label: "商品链接", icon: Store },
  { label: "预约咨询", icon: CalendarCheck },
  { label: "更多内容", icon: QrCode },
];

const creatorCases = [
  { name: "熊猫阿宝", role: "AI学习博主", fans: "粉丝1.2万", intro: "课程、资料和社群入口一页收齐。", initials: "宝" },
  { name: "本地生活小王", role: "探店达人", fans: "粉丝8200", intro: "探店笔记、团购和商务合作集中展示。", initials: "王" },
  { name: "设计师Mia", role: "视觉设计师", fans: "粉丝5300", intro: "作品集、报价、预约咨询直接跳转。", initials: "M" },
  { name: "张老师", role: "知识博主", fans: "粉丝2.1万", intro: "公开课、讲义和直播预约放进名片。", initials: "张" },
  { name: "私域顾问林", role: "私域运营", fans: "粉丝9600", intro: "客户案例、咨询入口和联系方式更清楚。", initials: "林" },
  { name: "小店主阿花", role: "小店经营", fans: "粉丝4300", intro: "商品橱窗、客服和门店信息一键访问。", initials: "花" },
];

export default function Home() {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#F7F1E7] text-[#2B241E]">
      <AppHeader />
      <main>
        <section className="relative isolate overflow-hidden px-4 pb-22 pt-12 sm:px-6 sm:pt-14 lg:px-8">
          <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,#FFFDF8_0%,#F7F1E7_48%,#F2E7D8_100%)]" />
          <div className="link168-aurora absolute inset-0 -z-10 bg-[radial-gradient(circle_at_14%_18%,rgba(221,232,205,0.65),transparent_24%),radial-gradient(circle_at_76%_24%,rgba(200,164,93,0.14),transparent_20%),radial-gradient(circle_at_58%_78%,rgba(242,231,216,0.72),transparent_26%)]" />
          <div className="absolute -left-24 bottom-10 -z-10 h-48 w-48 rounded-full border border-[#C8A45D]/20" />
          <div className="absolute right-[-90px] top-16 -z-10 size-[360px] rounded-full bg-[#DDE8CD]/70 blur-3xl" />
          <div className="absolute bottom-12 left-[30%] -z-10 h-28 w-[44rem] rotate-[-8deg] rounded-full border border-[#C8A45D]/20" />
          <div className="absolute left-8 top-36 -z-10 hidden text-7xl text-[#C8A45D]/18 lg:block">♡</div>

          <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center">
            <div className="max-w-3xl pt-5 text-[#2B241E]">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E8DCCB] bg-[#FFFDF8]/82 px-4 py-2 text-sm font-semibold text-[#3F5F31] shadow-sm">
                <Sparkles aria-hidden className="size-4 text-[#C8A45D]" />
                面向中文创作者、小店与个人 IP
              </p>
              <h1 className="text-[52px] font-black leading-[1.03] tracking-[-0.01em] sm:text-[68px] lg:text-[76px]">
                用一个链接，连接你的内容、服务与生意
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[#7A6D5E] sm:text-lg">
                用一张温柔、清楚、适合分享的 Link168 数字名片，收好公众号、小红书、抖音、商品橱窗、预约咨询和微信客服，让客户从认识你到联系你更顺手。
              </p>
              <HomeHandleForm />
              <div className="mt-6 grid gap-2 text-[15px] font-semibold text-[#5F5347] sm:grid-cols-2">
                {["小店入口、预约咨询、商品橱窗一页收齐", "适合微信、抖音、小红书和线下二维码", "注册后即可进入后台制作主页", "免费版保留 Powered by Link168"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <CheckCircle2 aria-hidden className="link168-nav-icon text-[#6F8F4E]" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative">
              {floatingPlatforms.map(({ label, icon: Icon, className }, index) => (
                <div
                  key={label}
                  className={`link168-float absolute z-10 hidden items-center gap-2 rounded-2xl px-3 py-2 text-xs font-black shadow-2xl shadow-black/15 sm:flex ${className}`}
                  style={{ animationDelay: `${index * 0.45}s` }}
                >
                  <Icon aria-hidden className="size-4" />
                  {label}
                </div>
              ))}
              <div className="absolute inset-8 -z-10 rounded-full bg-[#DDE8CD]/80 blur-3xl" />
              <PhonePreview
                variant="marketing"
                poweredLogoClickable
                username="yourname"
                displayName="花间手作"
                bio="花艺、手作、生活美学，用喜欢的事治愈每一天"
                links={phoneLinks}
              />
            </div>
          </div>
        </section>

        <section id="features" className="relative overflow-hidden bg-[#FFFDF8] px-4 py-16 sm:px-6 lg:px-8">
          <div className="absolute right-0 top-10 size-56 rounded-full bg-[#DDE8CD]/60 blur-3xl" />
          <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div className="relative rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8] p-6 text-[#2B241E] shadow-[0_22px_70px_rgba(86,68,46,0.10)]">
              <div className="absolute right-5 top-5 grid size-14 place-items-center rounded-2xl bg-[#DDE8CD] text-[#3F5F31]">
                <ChartNoAxesCombined aria-hidden className="link168-card-main-icon" />
              </div>
              <p className="text-sm font-semibold text-[#3F5F31]">核心功能</p>
              <h2 className="mt-4 max-w-sm text-3xl font-black leading-tight sm:text-4xl">把所有入口收进一张数字名片</h2>
              <p className="mt-4 text-sm leading-7 text-[#7A6D5E]">
                链接、二维码、商品、咨询和社媒入口组成一张清楚的行动地图，让访客从看到你到联系你更顺手。
              </p>
              <div className="mt-8 grid grid-cols-3 gap-3">
                {[Link2, QrCode, MonitorSmartphone].map((Icon, index) => (
                  <div key={index} className="grid aspect-square place-items-center rounded-3xl bg-[#F2E7D8]">
                    <Icon aria-hidden className="link168-card-main-icon text-[#3F5F31]" />
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {features.map(({ title, text, icon: Icon, accent }) => (
                <article
                  key={title}
                  className="link168-card-hover group relative overflow-hidden rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8] p-5 shadow-sm"
                >
                  <div className={`absolute -right-8 -top-8 size-28 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-xl transition group-hover:opacity-30`} />
                  <div className={`grid size-12 place-items-center rounded-2xl bg-gradient-to-br ${accent} text-[#2B241E] shadow-lg shadow-[#2B241E]/10`}>
                    <Icon aria-hidden className="link168-feature-icon" />
                  </div>
                  <h3 className="mt-5 text-xl font-black text-[#2B241E]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#F2E7D8] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="text-sm font-black text-[#3F5F31]">平台支持</p>
              <h2 className="mt-3 text-3xl font-black text-[#2B241E] sm:text-4xl">客户常去哪里，你的 Link168 就连到哪里</h2>
              <p className="mt-4 text-sm leading-7 text-[#7A6D5E]">
                适合创作者、商家、顾问、门店和自由职业者，把分散在不同平台的内容聚合成一个清楚的行动入口。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {platforms.map(({ label, icon: Icon }) => (
                <span
                  key={label}
                  className="link168-card-hover link168-wiggle-on-hover flex min-h-24 flex-col items-center justify-center gap-2 rounded-[24px] border border-[#E8DCCB] bg-[#FFFDF8] px-3 text-center text-sm font-black text-[#3F5F31] shadow-sm"
                >
                  <span className="grid size-10 place-items-center rounded-2xl bg-[#DDE8CD] text-[#3F5F31]">
                    <Icon aria-hidden className="link168-feature-icon" />
                  </span>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="cases" className="bg-[#FFFDF8] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-black text-[#3F5F31]">精选案例</p>
                <h2 className="mt-3 text-3xl font-black text-[#2B241E] sm:text-4xl">他们正在使用 Link168</h2>
              </div>
              <Link
                href="/register"
                className="link168-button-press inline-flex w-fit items-center gap-2 rounded-full border border-[#E8DCCB] bg-[#FFFDF8] px-5 py-3 text-sm font-black text-[#3F5F31] transition hover:-translate-y-0.5 hover:bg-[#DDE8CD]"
              >
                创建我的名片
                <ArrowRight aria-hidden className="link168-nav-icon" />
              </Link>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {creatorCases.map((item) => (
                <Link
                  key={item.name}
                  href="/register"
                  className="link168-card-hover group rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8] p-5 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="grid size-16 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#DDE8CD,#C8A45D)] text-xl font-black text-[#3F5F31] shadow-lg shadow-[#6F8F4E]/14">
                      {item.initials}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-black text-[#2B241E]">{item.name}</h3>
                      <p className="mt-1 text-sm font-bold text-[#3F5F31]">{item.role}</p>
                      <p className="mt-1 text-xs font-black text-[#C9824B]">{item.fans}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[#7A6D5E]">{item.intro}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="help" className="relative overflow-hidden bg-[#F7F1E7] px-4 py-16 sm:px-6 lg:px-8">
          <div className="absolute right-12 top-8 size-44 rounded-full bg-[#DDE8CD]/70 blur-3xl" />
          <div className="absolute bottom-8 left-12 hidden text-6xl text-[#C8A45D]/22 lg:block">♡</div>
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 rounded-[32px] border border-[#E8DCCB] bg-[#FFFDF8]/88 p-6 shadow-[0_24px_70px_rgba(86,68,46,0.12)] sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <p className="text-sm font-black text-[#3F5F31]">开始你的主页</p>
              <h2 className="mt-3 max-w-2xl text-4xl font-black leading-tight text-[#2B241E] sm:text-5xl">三分钟，把客户入口整理清楚</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-[#7A6D5E]">先把你最重要的内容、服务和联系方式放进一个页面，再把 link168.me/你的名字 分享出去。</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="link168-button-press inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#6F8F4E] px-6 font-black text-white shadow-xl shadow-[#6F8F4E]/20 transition hover:-translate-y-0.5 hover:bg-[#5E7F3F]"
              >
                免费创建我的 Link168
                <ArrowRight aria-hidden className="link168-feature-icon" />
              </Link>
              <Link
                href="/help"
                className="link168-button-press inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#E8DCCB] bg-[#FFFDF8] px-6 font-black text-[#2B241E] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#F2E7D8]"
              >
                查看帮助中心
                <BookOpenText aria-hidden className="link168-feature-icon" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
