import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#e5e7eb]/80 bg-white/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 sm:gap-4">
        <BrandLogo size="header" className="hidden !w-[146px] sm:inline-flex" />
        <BrandLogo size="compact" className="!w-[88px] sm:hidden" />
        <nav className="hidden items-center gap-8 text-[16px] font-semibold text-[#6b7280] lg:flex">
          <a href="#features" className="transition hover:text-[#8b5cf6]">
            功能
          </a>
          <a href="#pricing" className="transition hover:text-[#8b5cf6]">
            价格
          </a>
          <a href="#help" className="transition hover:text-[#8b5cf6]">
            帮助
          </a>
          <a href="#cases" className="transition hover:text-[#8b5cf6]">
            案例
          </a>
        </nav>
        <nav className="flex shrink-0 items-center gap-2 text-[14px] font-semibold sm:gap-2.5 sm:text-[16px]">
          <Link
            href="/login"
            className="inline-flex min-h-10 items-center rounded-full px-4 text-[#6b7280] transition hover:bg-[#f5f3ff] hover:text-[#8b5cf6] sm:min-h-11 sm:px-[18px]"
          >
            登录
          </Link>
          <Link
            href="/register"
            className="inline-flex min-h-10 items-center rounded-full bg-[#8b5cf6] px-4 font-semibold text-white shadow-lg shadow-[#8b5cf6]/25 transition hover:-translate-y-0.5 hover:bg-[#7c3aed] active:scale-[0.98] sm:min-h-11 sm:px-[18px]"
          >
            免费注册
          </Link>
        </nav>
      </div>
    </header>
  );
}
