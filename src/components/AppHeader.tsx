import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#E4E8E0] bg-white/88 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
        <Link href="/" aria-label="返回 Link168 首页">
          <BrandLogo size="header" className="hidden !w-[146px] sm:inline-flex" />
          <BrandLogo size="compact" className="!w-[88px] sm:hidden" />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-semibold text-[#596457] lg:flex" aria-label="首页导航">
          <a href="#features" className="transition hover:text-[#182016]">
            核心功能
          </a>
          <a href="#cases" className="transition hover:text-[#182016]">
            使用场景
          </a>
          <Link href="/register" className="transition hover:text-[#182016]">
            开始使用
          </Link>
          <a href="#about" className="transition hover:text-[#182016]">
            关于我们
          </a>
        </nav>

        <nav className="flex shrink-0 items-center gap-2 text-sm font-semibold" aria-label="账号操作">
          <Link href="/login" className="inline-flex min-h-10 items-center rounded-full px-4 text-[#596457] transition hover:bg-[#F1F3EE] hover:text-[#182016] sm:min-h-11">
            登录
          </Link>
          <Link
            href="/register"
            className="inline-flex min-h-10 items-center rounded-full bg-[#587744] px-4 text-white shadow-sm shadow-[#587744]/20 transition hover:-translate-y-0.5 hover:bg-[#486436] active:scale-[0.98] sm:min-h-11 sm:px-5"
          >
            免费注册
          </Link>
        </nav>
      </div>
    </header>
  );
}
