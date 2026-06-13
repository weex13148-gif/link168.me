import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#E7E4D8]/80 bg-[#FFFEF8]/88 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
        <BrandLogo size="header" className="hidden sm:inline-flex" />
        <BrandLogo size="compact" className="sm:hidden" />
        <nav className="hidden items-center gap-6 text-[15px] font-semibold text-[#254236] lg:flex">
          <a href="#features" className="transition hover:text-[#0B7A58]">
            功能介绍
          </a>
          <a href="#cases" className="transition hover:text-[#0B7A58]">
            精选案例
          </a>
          <a href="#help" className="transition hover:text-[#0B7A58]">
            帮助中心
          </a>
          <a href="#about" className="transition hover:text-[#0B7A58]">
            关于我们
          </a>
        </nav>
        <nav className="flex shrink-0 items-center gap-2 text-[15px] font-semibold">
          <Link href="/login" className="inline-flex min-h-11 items-center rounded-2xl px-4 text-[#254236] transition hover:bg-[#ECFDF3]">
            登录
          </Link>
          <Link
            href="/register"
            className="inline-flex min-h-11 items-center rounded-2xl bg-[#FACC15] px-4 text-[#113A1D] shadow-sm shadow-[#FACC15]/20 transition hover:-translate-y-0.5 active:scale-[0.98]"
          >
            免费注册
          </Link>
        </nav>
      </div>
    </header>
  );
}
