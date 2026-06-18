"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [devLink, setDevLink] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSuccess(false);
    setDevLink("");

    if (!email) {
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
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
        devResetUrl?: string;
      };
      setLoading(false);

      if (!response.ok || !result.success) {
        setMessage(result.message || "请求失败，请稍后重试。");
        return;
      }

      setSuccess(true);
      setMessage(result.message || "如果该邮箱已注册，我们已向其发送重置密码链接。");
      if (result.devResetUrl) setDevLink(result.devResetUrl);
    } catch {
      setLoading(false);
      setMessage("网络错误，请稍后重试。");
    }
  }

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md items-center overflow-hidden px-4 py-8">
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,#FFFDF8_0%,#F7F1E7_55%,#F2E7D8_100%)]" />
      <div className="absolute left-[-90px] top-24 -z-10 size-48 rounded-full bg-[#DDE8CD]/70 blur-3xl" />
      <div className="absolute bottom-16 right-[-80px] -z-10 size-56 rounded-full bg-[#F2E7D8]/80 blur-3xl" />

      <section className="w-full rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8]/90 p-6 shadow-[0_24px_70px_rgba(86,68,46,0.12)] backdrop-blur">
        <BrandLogo size="header" />
        <h1 className="mt-6 text-3xl font-black text-[#2B241E]">找回密码</h1>
        <p className="mt-3 text-sm leading-7 text-[#7A6D5E]">
          请输入你注册时使用的邮箱地址，我们会发送重置密码链接到你的邮箱。
        </p>

        {success ? (
          <>
            <div className="mt-6 rounded-2xl bg-[#DDE8CD]/60 p-4 text-sm text-[#3F5F31]">
              {message}
            </div>
            {devLink ? (
              <div className="mt-4 rounded-2xl border border-dashed border-[#E8DCCB] bg-[#FFFDF8] p-4 text-xs text-[#7A6D5E]">
                <p className="font-bold text-[#3F5F31]">开发模式提示：</p>
                <p className="mt-2 break-all">{devLink}</p>
              </div>
            ) : null}
          </>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            <label className="block">
              <span className="text-sm font-black text-[#3F5F31]">邮箱地址</span>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="mt-2 h-12 w-full rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] px-4 text-[#2B241E] outline-none transition placeholder:text-[#A69A8A] focus:border-[#6F8F4E] focus:bg-[#FFFDF8] focus:ring-4 focus:ring-[#6F8F4E]/12"
              />
            </label>
            {message ? (
              <p className="rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">
                {message}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="link168-button-press flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#6F8F4E] px-5 font-black text-white shadow-lg shadow-[#6F8F4E]/20 transition hover:-translate-y-0.5 hover:bg-[#5E7F3F] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "发送中..." : "发送重置密码链接"}
            </button>
          </form>
        )}

        <div className="mt-6 grid gap-3 text-center text-sm">
          <Link href="/login" className="font-black text-[#3F5F31]">
            想起密码？返回登录
          </Link>
        </div>
      </section>
    </main>
  );
}
