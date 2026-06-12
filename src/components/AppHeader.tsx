import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 rounded-full border border-white/70 bg-white/90 px-4 py-3 shadow-[0_18px_60px_rgba(11,107,43,0.12)] backdrop-blur">
        <BrandLogo size="header" className="hidden sm:inline-flex" />
        <BrandLogo size="compact" className="sm:hidden" />
        <nav className="hidden items-center gap-7 text-sm font-bold text-[#14532D] md:flex">
          <a href="#features" className="transition hover:text-[#16A34A]">
            功能介绍
          </a>
          <a href="#cases" className="transition hover:text-[#16A34A]">
            精选案例
          </a>
          <a href="#help" className="transition hover:text-[#16A34A]">
            帮助中心
          </a>
          <a href="#about" className="transition hover:text-[#16A34A]">
            关于我们
          </a>
        </nav>
        <nav className="flex shrink-0 items-center gap-2 text-sm font-bold">
          <Link href="/login" className="rounded-full px-4 py-2 text-[#14532D] transition hover:bg-[#ECFDF3]">
            登录
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-[linear-gradient(135deg,#FACC15,#F6C343)] px-4 py-2 text-[#113A1D] shadow-lg shadow-[#FACC15]/30 transition hover:-translate-y-0.5 active:scale-[0.98]"
          >
            免费注册
          </Link>
        </nav>
      </div>
    </header>
  );
}
