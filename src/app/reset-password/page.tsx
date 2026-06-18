"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!token) {
      setError("缺少重置链接。请从邮箱中的链接访问本页面。");
      return;
    }

    if (!password || password.length < 6) {
      setError("密码至少需要 6 位。");
      return;
    }

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致。");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
        message?: string;
        redirectTo?: string;
      };
      setLoading(false);

      if (!response.ok || !result.success) {
        setError(result.error || "重置失败，请稍后重试。");
        return;
      }

      setMessage(result.message || "密码已重置成功。");
      window.setTimeout(() => {
        router.push(result.redirectTo || "/dashboard");
        router.refresh();
      }, 1200);
    } catch {
      setLoading(false);
      setError("网络错误，请稍后重试。");
    }
  }

  return (
    <section className="w-full rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8]/90 p-6 shadow-[0_24px_70px_rgba(86,68,46,0.12)] backdrop-blur">
      <BrandLogo size="header" />
      <h1 className="mt-6 text-3xl font-black text-[#2B241E]">重置密码</h1>
      <p className="mt-3 text-sm leading-7 text-[#7A6D5E]">
        请输入你的新密码。重置成功后，你将自动登录并返回主页。
      </p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <label className="block">
          <span className="text-sm font-black text-[#3F5F31]">重置 Token</span>
          <input
            required
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="从邮箱链接自动填充"
            className="mt-2 h-12 w-full rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] px-4 text-sm text-[#2B241E] outline-none transition placeholder:text-[#A69A8A] focus:border-[#6F8F4E] focus:bg-[#FFFDF8] focus:ring-4 focus:ring-[#6F8F4E]/12"
          />
        </label>

        <label className="block">
          <span className="text-sm font-black text-[#3F5F31]">新密码</span>
          <input
            required
            minLength={6}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="至少 6 位"
            className="mt-2 h-12 w-full rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] px-4 text-[#2B241E] outline-none transition placeholder:text-[#A69A8A] focus:border-[#6F8F4E] focus:bg-[#FFFDF8] focus:ring-4 focus:ring-[#6F8F4E]/12"
          />
        </label>

        <label className="block">
          <span className="text-sm font-black text-[#3F5F31]">再次输入新密码</span>
          <input
            required
            minLength={6}
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="请再次输入"
            className="mt-2 h-12 w-full rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] px-4 text-[#2B241E] outline-none transition placeholder:text-[#A69A8A] focus:border-[#6F8F4E] focus:bg-[#FFFDF8] focus:ring-4 focus:ring-[#6F8F4E]/12"
          />
        </label>

        {error ? (
          <p className="rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">
            {error}
          </p>
        ) : null}

        {message ? (
          <p className="rounded-2xl bg-[#DDE8CD] px-4 py-3 text-sm font-bold text-[#3F5F31]">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="link168-button-press flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#6F8F4E] px-5 font-black text-white shadow-lg shadow-[#6F8F4E]/20 transition hover:-translate-y-0.5 hover:bg-[#5E7F3F] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "提交中..." : "重置并登录"}
        </button>
      </form>

      <div className="mt-6 grid gap-3 text-center text-sm">
        <Link href="/forgot-password" className="font-black text-[#3F5F31]">
          链接已失效？重新申请
        </Link>
        <Link href="/login" className="font-black text-[#3F5F31]">
          返回登录
        </Link>
      </div>
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md items-center overflow-hidden px-4 py-8">
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,#FFFDF8_0%,#F7F1E7_55%,#F2E7D8_100%)]" />
      <div className="absolute left-[-90px] top-24 -z-10 size-48 rounded-full bg-[#DDE8CD]/70 blur-3xl" />
      <div className="absolute bottom-16 right-[-80px] -z-10 size-56 rounded-full bg-[#F2E7D8]/80 blur-3xl" />
      <Suspense
        fallback={
          <section className="w-full rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8]/90 p-6 text-center text-sm text-[#7A6D5E]">
            正在加载...
          </section>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
