import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";

export function AppHeader() {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
      <LogoMark />
      <nav className="flex items-center gap-2 text-sm font-semibold">
        <Link
          href="/login"
          className="rounded-lg px-4 py-2 text-[#4A4A4A] transition hover:bg-[#F5F7FA] hover:text-[#1A1A1A]"
        >
          登录
        </Link>
        <Link
          href="/register"
          className="rounded-lg bg-[#5B6FFF] px-4 py-2 text-white shadow-sm shadow-[#5B6FFF]/20 transition hover:brightness-105 active:scale-[0.98]"
        >
          注册
        </Link>
      </nav>
    </header>
  );
}
