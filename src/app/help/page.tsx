import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  CircleHelp,
  Compass,
  FileText,
  Globe2,
  Home,
  LayoutDashboard,
  Link2,
  LogIn,
  Mail,
  MessageCircle,
  MonitorSmartphone,
  Rocket,
  Search,
  ShieldAlert,
  Sparkles,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { SiteFooter } from "@/components/SiteFooter";

type HelpEntry = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const helpEntries: HelpEntry[] = [
  {
    title: "什么是 Link168？",
    description: "了解 Link168 如何把多个入口聚合成一个数字名片。",
    href: "#intro",
    icon: CircleHelp,
  },
  {
    title: "Link168 功能介绍",
    description: "主页、链接、二维码、私域入口、公开分享。",
    href: "#features",
    icon: Sparkles,
  },
  {
    title: "Link168 官方使用指南",
    description: "从注册到创建个人主页。",
    href: "#guide",
    icon: BookOpenText,
  },
  {
    title: "如何获取链接？",
    description: "微信公众号、小红书、抖音、视频号、商品链接等如何复制链接。",
    href: "#links",
    icon: Link2,
  },
  {
    title: "看看其他人搭建的页面",
    description: "参考优秀创作者和商家的主页案例。",
    href: "#examples",
    icon: Search,
  },
  {
    title: "接入自有域名",
    description: "后续高级用户可绑定自己的域名。",
    href: "#domain",
    icon: Globe2,
  },
  {
    title: "官方邮箱",
    description: "用于商务合作、问题反馈。",
    href: "#contact",
    icon: Mail,
  },
  {
    title: "公众号",
    description: "关注 Link168 获取教程和更新。",
    href: "#wechat",
    icon: MessageCircle,
  },
  {
    title: "登录 / 注册 Link168",
    description: "已有账号登录，新用户注册。",
    href: "/register",
    icon: UserPlus,
  },
  {
    title: "回到官网",
    description: "返回 Link168.me 首页。",
    href: "/",
    icon: Home,
  },
  {
    title: "回到后台",
    description: "已登录用户进入 Dashboard。",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
];

const quickLinks: HelpEntry[] = [
  { title: "登录", description: "已有账号继续管理主页。", href: "/login", icon: LogIn },
  { title: "用户协议", description: "查看 Link168 用户协议。", href: "/terms", icon: FileText },
  { title: "隐私政策", description: "查看个人信息保护说明。", href: "/privacy", icon: Compass },
  { title: "举报中心", description: "举报违法违规或侵权内容。", href: "/report", icon: ShieldAlert },
];

const guideSections = [
  {
    id: "intro",
    title: "什么是 Link168？",
    text: "Link168 是一个数字名片工具，把分散在不同平台的内容、联系方式和服务入口整理成一个公开主页。",
  },
  {
    id: "features",
    title: "Link168 功能介绍",
    text: "你可以创建主页、添加链接、公开分享主页，并在后续版本中承接二维码、私域入口等更多展示能力。",
  },
  {
    id: "guide",
    title: "官方使用指南",
    text: "从首页输入链接后缀开始，完成注册后进入 Dashboard，保存资料并添加第一个链接。",
  },
  {
    id: "links",
    title: "如何获取链接？",
    text: "复制公众号文章、小红书笔记、抖音主页、视频号内容、商品页或官网地址，粘贴到后台链接管理中。",
  },
  {
    id: "examples",
    title: "看看其他人搭建的页面",
    text: "可以参考首页展示的虚拟创作者案例，先把最重要的入口放到最前面。",
  },
  {
    id: "domain",
    title: "接入自有域名",
    text: "自有域名绑定属于后续高级能力，当前可先使用 link168.me/你的后缀 公开分享。",
  },
  {
    id: "contact",
    title: "官方邮箱",
    text: "商务合作和问题反馈入口会在正式客服信息确认后补充。",
  },
  {
    id: "wechat",
    title: "公众号",
    text: "公众号教程与更新入口会在官方账号上线后补充。",
  },
];

function HelpCard({ title, description, href, icon: Icon }: HelpEntry) {
  return (
    <Link
      href={href}
      className="link168-card-hover link168-button-press group flex min-h-28 items-center gap-4 rounded-[26px] border border-[#E7E4D8] bg-white px-4 py-4 text-left shadow-sm"
    >
      <span className="link168-card-icon link168-wiggle-on-hover grid size-12 shrink-0 place-items-center rounded-2xl bg-[#ECFDF3] text-[#16A34A] transition group-hover:bg-[#FACC15] group-hover:text-[#113A1D]">
        <Icon aria-hidden className="link168-feature-icon" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-black text-[#113A1D]">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-[#52624A]">{description}</span>
      </span>
      <ArrowRight aria-hidden className="link168-feature-icon shrink-0 text-[#8FA083] transition group-hover:translate-x-1 group-hover:text-[#0B7A58]" />
    </Link>
  );
}

export default function HelpPage() {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#FFFEF8] text-[#113A1D]">
      <main>
        <section className="relative isolate overflow-hidden px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,#092B17_0%,#0B6B2B_42%,#F7F6EA_100%)]" />
          <div className="link168-aurora absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_18%,rgba(250,204,21,0.42),transparent_25%),radial-gradient(circle_at_82%_22%,rgba(255,247,214,0.56),transparent_22%),radial-gradient(circle_at_56%_82%,rgba(22,163,74,0.36),transparent_24%)]" />
          <div className="absolute -left-24 top-28 -z-10 size-72 rounded-full border border-white/20" />
          <div className="absolute right-[-70px] top-10 -z-10 size-[320px] rounded-full bg-[#FACC15]/25 blur-3xl" />
          <div className="absolute bottom-8 left-[28%] -z-10 h-28 w-[42rem] rotate-[-7deg] rounded-full border border-white/20" />

          <div className="mx-auto w-full max-w-7xl">
            <header className="flex items-center justify-between">
              <BrandLogo size="header" />
              <Link
                href="/register"
                className="link168-button-press hidden min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-[15px] font-semibold text-[#113A1D] shadow-xl shadow-black/10 transition hover:-translate-y-0.5 sm:inline-flex"
              >
                创建主页
                <Rocket aria-hidden className="link168-nav-icon" />
              </Link>
            </header>

            <div className="grid gap-10 pt-16 lg:grid-cols-[minmax(0,0.88fr)_minmax(360px,1.12fr)] lg:items-end">
              <div className="text-white">
                <p className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-xs font-black text-[#FFF7D6]">
                  <Sparkles aria-hidden className="size-4" />
                  Link168 使用支持
                </p>
                <h1 className="mt-5 text-5xl font-black leading-tight sm:text-6xl">Link168 帮助中心</h1>
                <p className="mt-5 max-w-2xl text-2xl font-black leading-snug text-[#FACC15]">
                  链接聚合分享，就用 Link168
                  <span className="block text-white">三分钟搭建你的数字名片</span>
                </p>
                <p className="mt-5 max-w-2xl text-base leading-8 text-white/80">
                  从注册、创建主页到复制平台链接，这里整理最常用的操作入口。先把客户需要点击的内容收齐，再把一个主页地址分享出去。
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-6 -z-10 rounded-full bg-[#FACC15]/25 blur-3xl" />
                <div className="rounded-[34px] border border-white/20 bg-white/20 p-4 shadow-2xl shadow-black/20 backdrop-blur">
                  <div className="rounded-[28px] bg-[#F7F6EA] p-5 text-[#113A1D]">
                    <div className="flex items-center gap-3">
                      <span className="grid size-14 place-items-center rounded-2xl bg-[#FACC15]">
                        <MonitorSmartphone aria-hidden className="size-7" />
                      </span>
                      <div>
                        <p className="text-lg font-black">新手三步</p>
                        <p className="text-sm font-bold text-[#52624A]">注册、保存主页、添加链接</p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3">
                      {["抢占 link168.me/用户名", "填写资料并保存公开主页", "添加公众号、小红书、抖音等链接"].map((item, index) => (
                        <div key={item} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-black shadow-sm">
                          <span className="grid size-8 place-items-center rounded-full bg-[#ECFDF3] text-[#0B6B2B]">{index + 1}</span>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-black text-[#0B6B2B]">快速入口</p>
                <h2 className="mt-2 text-3xl font-black sm:text-4xl">你想解决什么问题？</h2>
              </div>
              <Link
                href="/dashboard"
                className="link168-button-press inline-flex w-fit items-center gap-2 rounded-full bg-[#0B6B2B] px-5 py-3 text-sm font-black text-white shadow-xl shadow-[#0B6B2B]/15 transition hover:-translate-y-0.5"
              >
                回到后台
                <LayoutDashboard aria-hidden className="size-4" />
              </Link>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {helpEntries.map((entry) => (
                <HelpCard key={entry.title} {...entry} />
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {quickLinks.map((entry) => (
                <HelpCard key={entry.title} {...entry} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-2">
            {guideSections.map((item) => (
              <article key={item.id} id={item.id} className="rounded-[26px] border border-[#DDE8CF] bg-[#FCFFF7] p-5">
                <p className="text-sm font-black text-[#0B6B2B]">Link168 Help</p>
                <h3 className="mt-2 text-2xl font-black text-[#113A1D]">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#52624A]">{item.text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
