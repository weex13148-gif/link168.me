"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSuccess(false);

    if (!email.trim()) {
      setMessage("请输入邮箱地址。");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json() as { success?: boolean; message?: string; error?: string };
      if (!response.ok || !result.success) {
        setMessage(result.error || result.message || "请求失败，请稍后重试。");
        return;
      }
      setSuccess(true);
      setMessage(result.message || "如果该邮箱已注册，我们将发送密码重置邮件，请检查收件箱或垃圾箱。");
    } catch {
      setMessage("网络连接失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md items-center overflow-hidden px-4 py-8">
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,#FFFDF8_0%,#F7F1E7_55%,#F2E7D8_100%)]" />
      <section className="w-full rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8]/94 p-6 shadow-[0_24px_70px_rgba(86,68,46,0.12)]">
        <BrandLogo size="header" />
        <h1 className="mt-6 text-3xl font-black text-[#2B241E]">找回密码</h1>
        <p className="mt-3 text-sm leading-7 text-[#7A6D5E]">输入注册邮箱，我们会发送一次性密码重置链接。为保护账号安全，页面不会透露该邮箱是否已经注册。</p>

        {success ? (
          <div className="mt-6 rounded-2xl bg-[#EEF4E7] p-4 text-sm font-bold leading-7 text-[#355126]">
            {message}
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-black text-[#3F5F31]">注册邮箱</span>
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="请输入注册邮箱" className="h-12 rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] px-4 outline-none focus:border-[#6F8F4E] focus:bg-white" />
            </label>
            {message ? <p className="rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">{message}</p> : null}
            <button type="submit" disabled={loading} className="h-12 rounded-full bg-[#6F8F4E] px-5 font-black text-white disabled:opacity-60">
              {loading ? "正在发送…" : "发送密码重置邮件"}
            </button>
          </form>
        )}

        <div className="mt-6 grid gap-3 text-center text-sm">
          {success ? <button type="button" onClick={() => { setSuccess(false); setMessage(""); }} className="font-black text-[#3F5F31]">重新填写邮箱</button> : null}
          <Link href="/login" className="font-bold text-[#7A6D5E]">返回登录</Link>
        </div>
      </section>
    </main>
  );
}
