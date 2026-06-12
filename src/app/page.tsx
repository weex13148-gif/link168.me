import Link from "next/link";
import { ArrowRight, CheckCircle2, Link2, UserRound } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { ProfilePreview } from "@/components/ProfilePreview";
import { SiteFooter } from "@/components/SiteFooter";

const steps = [
  "注册账号",
  "登录后台",
  "创建一个公开主页",
  "添加你的第一个链接",
];

export default function Home() {
  return (
    <>
      <AppHeader />
      <main>
        <section className="bg-[linear-gradient(135deg,#F7F9FC_0%,#EEF0FF_58%,#FFF4EF_100%)]">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 pb-14 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_410px] lg:items-center lg:px-8 lg:pb-20 lg:pt-14">
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-[#5B6FFF]/20 bg-white/80 px-3 py-2 text-xs font-bold text-[#5B6FFF] shadow-sm">
                <Link2 aria-hidden className="size-4" />
                link168.me
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight text-[#1A1A1A] sm:text-5xl lg:text-6xl">
                Link168，把你的链接放进一个主页
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#4A4A4A] sm:text-lg">
                V0.1 支持注册、登录、创建主页、添加链接和公开访问主页。免费版可创建一个主页和一个用户名，并固定显示 Link168 品牌入口。
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#5B6FFF] px-5 font-bold text-white shadow-lg shadow-[#5B6FFF]/25 transition hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98]"
                >
                  免费创建主页
                  <ArrowRight aria-hidden className="size-5" />
                </Link>
                <Link
                  href="/login"
                  className="flex min-h-12 items-center justify-center rounded-lg border border-[#E0E0E0] bg-white px-5 font-bold text-[#1A1A1A] shadow-sm transition hover:-translate-y-0.5 hover:border-[#5B6FFF]/40 active:scale-[0.98]"
                >
                  登录后台
                </Link>
              </div>
              <div className="mt-7 grid gap-2 text-sm font-semibold text-[#4A4A4A] sm:grid-cols-2">
                {steps.map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <CheckCircle2 aria-hidden className="size-4 text-[#52C41A]" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <section aria-label="手机端主页预览" className="pb-2 lg:pb-0">
              <ProfilePreview
                username="yourname"
                displayName="你的主页"
                bio="保存资料后，这里会显示你的简介和链接。"
                links={[
                  {
                    id: "sample",
                    label: "我的第一个链接",
                    caption: "公开主页会展示已添加的链接",
                    href: "#",
                  },
                ]}
              />
            </section>
          </div>
        </section>

        <section className="bg-white py-12 sm:py-16">
          <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
            <article className="rounded-lg border border-[#E0E0E0] bg-white p-5 shadow-sm">
              <UserRound aria-hidden className="size-7 text-[#5B6FFF]" />
              <h2 className="mt-4 text-xl font-black text-[#1A1A1A]">一个账号</h2>
              <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">通过邮箱注册和登录，进入后台管理你的主页。</p>
            </article>
            <article className="rounded-lg border border-[#E0E0E0] bg-white p-5 shadow-sm">
              <Link2 aria-hidden className="size-7 text-[#5B6FFF]" />
              <h2 className="mt-4 text-xl font-black text-[#1A1A1A]">一个主页</h2>
              <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">免费版只能创建一个公开主页和一个用户名。</p>
            </article>
            <article className="rounded-lg border border-[#E0E0E0] bg-white p-5 shadow-sm">
              <CheckCircle2 aria-hidden className="size-7 text-[#52C41A]" />
              <h2 className="mt-4 text-xl font-black text-[#1A1A1A]">公开访问</h2>
              <p className="mt-2 text-sm leading-6 text-[#4A4A4A]">保存资料并添加链接后，访客可通过用户名访问你的主页。</p>
            </article>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
