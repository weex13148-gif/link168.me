import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#E8DCCB]/80 bg-[#FFFDF8]/86 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 sm:gap-4">
        <BrandLogo size="header" className="hidden !w-[146px] sm:inline-flex" />
        <BrandLogo size="compact" className="!w-[88px] sm:hidden" />
        <nav className="hidden items-center gap-8 text-[16px] font-semibold text-[#5F5347] lg:flex">
          <a href="#features" className="transition hover:text-[#3F5F31]">
            功能介绍
          </a>
          <a href="#cases" className="transition hover:text-[#3F5F31]">
            精选案例
          </a>
          <a href="#help" className="transition hover:text-[#3F5F31]">
            帮助中心
          </a>
          <a href="#about" className="transition hover:text-[#3F5F31]">
            关于我们
          </a>
        </nav>
        <nav className="flex shrink-0 items-center gap-2 text-[14px] font-semibold sm:gap-2.5 sm:text-[16px]">
          <Link href="/login" className="inline-flex min-h-10 items-center rounded-2xl px-3 text-[#5F5347] transition hover:bg-[#F2E7D8] hover:text-[#2B241E] sm:min-h-11 sm:px-[18px]">
            登录
          </Link>
          <Link
            href="/register"
            className="inline-flex min-h-10 items-center rounded-2xl bg-[#6F8F4E] px-3 text-white shadow-sm shadow-[#6F8F4E]/20 transition hover:-translate-y-0.5 hover:bg-[#5E7F3F] active:scale-[0.98] sm:min-h-11 sm:px-[18px]"
          >
            免费注册
          </Link>
        </nav>
      </div>
    </header>
  );
}
