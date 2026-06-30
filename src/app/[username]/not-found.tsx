import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center justify-center px-4 py-12">
      <div className="mb-8">
        <BrandLogo size="compact" />
      </div>

      <section className="w-full rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8] p-8 text-center shadow-[0_18px_55px_rgba(86,68,46,0.08)]">
        <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-[#DDE8CD] text-[#3F5F31]">
          <span className="text-2xl font-black">404</span>
        </div>
        <h1 className="text-2xl font-black text-[#2B241E]">没找到这个主页</h1>
        <p className="mt-3 text-sm leading-7 text-[#7A6D5E]">
          可能是地址输入错误，或该名片已被所有者更新为其他地址。
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#E8DCCB] bg-white px-6 text-sm font-black text-[#2B241E] shadow-sm"
          >
            返回首页
          </Link>
          <Link
            href="/register"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#6F8F4E] px-6 text-sm font-black text-white shadow-sm shadow-[#6F8F4E]/20"
          >
            创建我的名片
          </Link>
        </div>
      </section>

      <p className="mt-6 text-xs text-[#7A6D5E]">
        <Link href="/" className="hover:opacity-80">
          由 Link168 提供
        </Link>
      </p>
    </main>
  );
}
