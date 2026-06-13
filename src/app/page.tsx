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
  { label: "微信", icon: MessageCircle, className: "left-0 top-16 bg-[#ECFDF3] text-[#16A34A]" },
  { label: "小红书", icon: BookOpenText, className: "-right-4 top-28 bg-[#FFF1F0] text-[#D4380D]" },
  { label: "抖音", icon: Video, className: "left-2 bottom-28 bg-[#111827] text-white" },
  { label: "网站", icon: Globe2, className: "-right-3 bottom-40 bg-white text-[#0B6B2B]" },
  { label: "商品", icon: ShoppingBag, className: "right-12 bottom-8 bg-[#FFF7D6] text-[#AD6800]" },
];

const features: Array<{ title: string; text: string; icon: LucideIcon; accent: string }> = [
  {
    title: "一个链接",
    text: "把内容、商品、咨询和联系方式收进一个入口。",
    icon: Link2,
    accent: "from-[#16A34A] to-[#86EFAC]",
  },
  {
    title: "专属主页",
    text: "用头像、简介和链接，搭好你的数字名片。",
    icon: MonitorSmartphone,
    accent: "from-[#FACC15] to-[#FDE68A]",
  },
  {
    title: "高效传播",
    text: "适合放进主页、海报、社群、视频和文章末尾。",
    icon: Share2,
    accent: "from-[#0B6B2B] to-[#22C55E]",
  },
  {
    title: "数据统计",
    text: "为后续访问分析和点击洞察预留清晰路径。",
    icon: BarChart3,
    accent: "from-[#113A1D] to-[#84CC16]",
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
    <div className="min-h-dvh overflow-x-hidden bg-[#F7F6EA] text-[#113A1D]">
      <AppHeader />
      <main>
        <section className="relative isolate overflow-hidden px-4 pb-20 pt-8 sm:px-6 lg:px-8">
          <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,#092B17_0%,#0B6B2B_38%,#E7F8DD_100%)]" />
          <div className="link168-aurora absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(250,204,21,0.42),transparent_24%),radial-gradient(circle_at_78%_28%,rgba(255,247,214,0.55),transparent_20%),radial-gradient(circle_at_58%_78%,rgba(22,163,74,0.35),transparent_24%)]" />
          <div className="absolute -left-28 top-24 -z-10 size-72 rounded-full border border-white/20" />
          <div className="absolute right-[-80px] top-16 -z-10 size-[340px] rounded-full bg-[#FACC15]/20 blur-3xl" />
          <div className="absolute bottom-10 left-[36%] -z-10 h-32 w-[48rem] rotate-[-8deg] rounded-full border border-white/20" />

          <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center">
            <div className="max-w-3xl pt-4 text-white">
              <h1 className="text-5xl font-black leading-tight sm:text-6xl lg:text-7xl">
                一个人，一个链接，连接全网
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/78 sm:text-lg">
                用一个 Link168 主页，聚合微信公众号、小红书、抖音、视频号、网站链接、商品橱窗和预约咨询，让客户只记住你的一个链接。
              </p>
              <HomeHandleForm />
              <div className="mt-6 grid gap-2 text-sm font-black text-white/86 sm:grid-cols-2">
                {["一个页面，展示全部", "一个链接，连接全网", "分享给主页、视频、文章末尾、群聊和名片二维码", "让流量价值翻倍，只要一分钟"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <CheckCircle2 aria-hidden className="size-4 text-[#FACC15]" />
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
              <div className="absolute inset-8 -z-10 rounded-full bg-[#FACC15]/25 blur-3xl" />
              <PhonePreview
                variant="marketing"
                poweredLogoClickable
                username="yourname"
                displayName="Link168 名片"
                bio="一个人，一个链接，连接全网"
                links={phoneLinks}
              />
            </div>
          </div>
        </section>

        <section id="features" className="relative overflow-hidden bg-white px-4 py-16 sm:px-6 lg:px-8">
          <div className="absolute right-0 top-10 size-56 rounded-full bg-[#FACC15]/15 blur-3xl" />
          <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div className="relative rounded-[32px] bg-[#0B3D1C] p-6 text-white shadow-[0_24px_80px_rgba(11,61,28,0.24)]">
              <div className="absolute right-5 top-5 grid size-14 place-items-center rounded-2xl bg-[#FACC15] text-[#113A1D]">
                <ChartNoAxesCombined aria-hidden className="size-7" />
              </div>
              <p className="text-sm font-black text-[#FACC15]">核心功能</p>
              <h2 className="mt-4 max-w-sm text-3xl font-black leading-tight sm:text-4xl">把所有入口收进一张数字名片</h2>
              <p className="mt-4 text-sm leading-7 text-white/72">
                链条、手机、图表和平台入口组成一张清晰的行动地图，让访客从看到你到联系你更顺手。
              </p>
              <div className="mt-8 grid grid-cols-3 gap-3">
                {[Link2, QrCode, MonitorSmartphone].map((Icon, index) => (
                  <div key={index} className="grid aspect-square place-items-center rounded-3xl bg-white/10">
                    <Icon aria-hidden className="size-8 text-[#FACC15]" />
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {features.map(({ title, text, icon: Icon, accent }) => (
                <article
                  key={title}
                  className="link168-card-hover group relative overflow-hidden rounded-[28px] border border-[#DDE8CF] bg-[#FCFFF7] p-5 shadow-sm"
                >
                  <div className={`absolute -right-8 -top-8 size-28 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-xl transition group-hover:opacity-30`} />
                  <div className={`grid size-12 place-items-center rounded-2xl bg-gradient-to-br ${accent} text-[#113A1D] shadow-lg shadow-[#113A1D]/10`}>
                    <Icon aria-hidden className="size-6" />
                  </div>
                  <h3 className="mt-5 text-xl font-black text-[#113A1D]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#52624A]">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#F7F6EA] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="text-sm font-black text-[#0B6B2B]">平台支持</p>
              <h2 className="mt-3 text-3xl font-black text-[#113A1D] sm:text-4xl">客户常去哪里，你的 Link168 就连到哪里</h2>
              <p className="mt-4 text-sm leading-7 text-[#52624A]">
                适合创作者、商家、顾问、门店和自由职业者，把分散在不同平台的内容聚合成一个清楚的行动入口。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {platforms.map(({ label, icon: Icon }) => (
                <span
                  key={label}
                  className="link168-card-hover link168-wiggle-on-hover flex min-h-24 flex-col items-center justify-center gap-2 rounded-[24px] border border-[#DDE8CF] bg-white px-3 text-center text-sm font-black text-[#14532D] shadow-sm"
                >
                  <span className="grid size-10 place-items-center rounded-2xl bg-[#ECFDF3] text-[#16A34A]">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="cases" className="bg-white px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-black text-[#0B6B2B]">精选案例</p>
                <h2 className="mt-3 text-3xl font-black text-[#113A1D] sm:text-4xl">他们正在使用 Link168</h2>
              </div>
              <Link
                href="/register"
                className="link168-button-press inline-flex w-fit items-center gap-2 rounded-full bg-[#ECFDF3] px-5 py-3 text-sm font-black text-[#0B6B2B] transition hover:-translate-y-0.5"
              >
                创建我的名片
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {creatorCases.map((item) => (
                <Link
                  key={item.name}
                  href="/register"
                  className="link168-card-hover group rounded-[28px] border border-[#DDE8CF] bg-[#FCFFF7] p-5 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="grid size-16 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#16A34A,#FACC15)] text-xl font-black text-white shadow-lg shadow-[#16A34A]/20">
                      {item.initials}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-black text-[#113A1D]">{item.name}</h3>
                      <p className="mt-1 text-sm font-bold text-[#0B6B2B]">{item.role}</p>
                      <p className="mt-1 text-xs font-black text-[#AD6800]">{item.fans}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[#52624A]">{item.intro}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="help" className="bg-[#0B3D1C] px-4 py-16 text-white sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-[#FACC15]">开始你的主页</p>
              <h2 className="mt-3 max-w-2xl text-4xl font-black leading-tight sm:text-5xl">三分钟，把客户入口整理清楚</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="link168-button-press inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#FACC15] px-6 font-black text-[#113A1D] shadow-xl shadow-black/20 transition hover:-translate-y-0.5"
              >
                免费创建我的 Link168
                <ArrowRight aria-hidden className="size-5" />
              </Link>
              <Link
                href="/help"
                className="link168-button-press inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 font-black text-[#113A1D] shadow-xl shadow-black/20 transition hover:-translate-y-0.5"
              >
                查看帮助中心
                <BookOpenText aria-hidden className="size-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
