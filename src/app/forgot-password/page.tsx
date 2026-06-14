import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export default function ForgotPasswordPage() {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md items-center overflow-hidden px-4 py-8">
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,#FFFDF8_0%,#F7F1E7_55%,#F2E7D8_100%)]" />
      <div className="absolute -left-20 top-20 -z-10 size-48 rounded-full bg-[#DDE8CD]/70 blur-3xl" />
      <div className="absolute bottom-16 right-[-80px] -z-10 size-56 rounded-full bg-[#F2E7D8]/80 blur-3xl" />
      <section className="w-full rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8]/90 p-6 shadow-[0_24px_70px_rgba(86,68,46,0.12)] backdrop-blur">
        <BrandLogo size="header" />
        <h1 className="mt-6 text-3xl font-black text-[#2B241E]">找回密码</h1>
        <p className="mt-3 text-sm leading-7 text-[#7A6D5E]">如需找回密码，请联系网站管理员处理。管理员可以重置密码，但不能查看你的原密码。</p>
        <Link
          href="/login"
          className="link168-button-press mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-[#6F8F4E] px-5 text-sm font-black text-white shadow-lg shadow-[#6F8F4E]/18 transition hover:-translate-y-0.5 hover:bg-[#5E7F3F]"
        >
          返回登录
        </Link>
      </section>
    </main>
  );
}
