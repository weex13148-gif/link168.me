import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4 py-8">
      <section className="w-full rounded-lg border border-[#E0E0E0] bg-white p-6 shadow-sm">
        <BrandLogo size="header" />
        <h1 className="mt-6 text-2xl font-black">找回密码</h1>
        <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">如需找回密码，请联系网站管理员处理。</p>
        <Link
          href="/login"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#5B6FFF] px-5 text-sm font-black text-white"
        >
          返回登录
        </Link>
      </section>
    </main>
  );
}
