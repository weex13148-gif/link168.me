import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BookOpenText, LogIn, UserPlus } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { SiteFooter } from "@/components/SiteFooter";

export type LegalSection = {
  id: string;
  title: string;
  children: ReactNode;
};

type LegalPageProps = {
  title: string;
  englishTitle: string;
  subtitle: string;
  sections: LegalSection[];
};

const navLinks = [
  { label: "功能介绍", href: "/#features" },
  { label: "精选案例", href: "/#cases" },
  { label: "帮助中心", href: "/help" },
  { label: "登录", href: "/login" },
];

export function LegalPage({ title, englishTitle, subtitle, sections }: LegalPageProps) {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#F7F6EA] text-[#113A1D]">
      <header className="sticky top-0 z-30 border-b border-white/20 bg-[#F7F6EA]/88 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
          <BrandLogo size="header" />
          <nav className="hidden items-center gap-5 text-sm font-black text-[#14532D] md:flex">
            {navLinks.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-[#16A34A]">
                {item.label}
              </Link>
            ))}
            <Link
              href="/register"
              className="link168-button-press inline-flex min-h-10 items-center gap-2 rounded-full bg-[#FACC15] px-4 text-[#113A1D] shadow-sm transition hover:-translate-y-0.5"
            >
              免费注册
              <UserPlus aria-hidden className="size-4" />
            </Link>
          </nav>
          <Link
            href="/login"
            className="link168-button-press grid size-10 place-items-center rounded-full bg-white text-[#0B6B2B] shadow-sm md:hidden"
          >
            <LogIn aria-label="登录" className="size-5" />
          </Link>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden px-4 pb-14 pt-12 sm:px-6 lg:px-8">
          <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,#092B17_0%,#0B6B2B_44%,#F7F6EA_100%)]" />
          <div className="link168-aurora absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_18%,rgba(250,204,21,0.42),transparent_24%),radial-gradient(circle_at_82%_24%,rgba(255,247,214,0.55),transparent_22%),radial-gradient(circle_at_58%_80%,rgba(22,163,74,0.34),transparent_24%)]" />
          <div className="absolute -left-28 top-24 -z-10 size-72 rounded-full border border-white/20" />
          <div className="absolute right-[-80px] top-16 -z-10 size-[320px] rounded-full bg-[#FACC15]/25 blur-3xl" />
          <div className="absolute bottom-5 left-[34%] -z-10 h-28 w-[42rem] -rotate-6 rounded-full border border-white/20" />

          <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[minmax(0,0.84fr)_minmax(360px,1.16fr)] lg:items-end">
            <div className="text-white">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-xs font-black text-[#FFF7D6]">
                <BookOpenText aria-hidden className="size-4" />
                Link168 Legal Center
              </p>
              <h1 className="mt-5 text-5xl font-black leading-tight sm:text-6xl">{title}</h1>
              <p className="mt-4 text-2xl font-black text-[#FACC15]">{englishTitle}</p>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/80">{subtitle}</p>
            </div>

            <div className="rounded-[32px] border border-white/20 bg-white/20 p-5 text-white shadow-2xl shadow-black/15 backdrop-blur">
              <p className="text-sm font-black text-[#FACC15]">最后更新时间：2026-06-12</p>
              <p className="mt-4 text-2xl font-black leading-snug">请在使用 Link168 前完整阅读本页面内容。</p>
              <p className="mt-4 text-sm leading-7 text-white/80">
                本法律中心用于说明平台服务边界、用户责任、信息处理规则与平台合规处置方式。继续使用 Link168，即表示你已理解相关条款。
              </p>
            </div>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-24 lg:h-fit">
              <nav className="rounded-[26px] border border-[#DDE8CF] bg-white/82 p-3 shadow-sm backdrop-blur">
                <p className="px-3 py-2 text-sm font-black text-[#0B6B2B]">章节目录</p>
                <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
                  {sections.map((section, index) => (
                    <Link
                      key={section.id}
                      href={`#${section.id}`}
                      className="link168-button-press flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-bold text-[#52624A] transition hover:bg-[#ECFDF3] hover:text-[#113A1D]"
                    >
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#F7F6EA] text-xs font-black text-[#0B6B2B]">
                        {index + 1}
                      </span>
                      <span className="truncate">{section.title}</span>
                    </Link>
                  ))}
                </div>
              </nav>
            </aside>

            <article className="min-w-0 rounded-[30px] bg-white px-5 py-7 shadow-[0_24px_80px_rgba(17,58,29,0.08)] sm:px-8 lg:px-10">
              <div className="rounded-3xl border border-[#DDE8CF] bg-[#FCFFF7] p-5">
                <p className="text-sm font-black text-[#0B6B2B]">重点提示</p>
                <p className="mt-2 text-sm leading-7 text-[#52624A]">
                  Link168 鼓励用户合法、诚信使用链接聚合服务。用户应对自己发布、填写、上传或跳转的内容承担责任；平台会依法依规处理违法违规内容，并在法律允许范围内明确服务责任边界。
                </p>
              </div>

              <div className="mt-8 space-y-10">
                {sections.map((section, index) => (
                  <section key={section.id} id={section.id} className="scroll-mt-28 border-t border-[#DDE8CF] pt-8 first:border-t-0 first:pt-0">
                    <p className="text-sm font-black text-[#0B6B2B]">{String(index + 1).padStart(2, "0")}</p>
                    <h2 className="mt-2 text-2xl font-black text-[#113A1D]">{section.title}</h2>
                    <div className="mt-4 space-y-4 text-sm leading-7 text-[#52624A] legal-content">{section.children}</div>
                  </section>
                ))}
              </div>

              <div className="mt-10 flex flex-col gap-3 rounded-[26px] bg-[#0B3D1C] p-5 text-white sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-[#FACC15]">仍有疑问？</p>
                  <p className="mt-1 text-sm text-white/80">你可以前往帮助中心或举报中心继续处理相关问题。</p>
                </div>
                <Link
                  href="/help"
                  className="link168-button-press inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-[#113A1D] transition hover:-translate-y-0.5"
                >
                  帮助中心
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </div>
            </article>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
