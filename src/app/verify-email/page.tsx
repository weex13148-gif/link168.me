"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const legacyToken = searchParams.get("token") || "";
  const [code, setCode] = useState(/^\d{6}$/.test(legacyToken) ? legacyToken : "");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [message, setMessage] = useState("验证码已发送，请检查收件箱或垃圾箱。");
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!legacyToken || /^\d{6}$/.test(legacyToken)) return;
    void verifyCredential(legacyToken);
    // 兼容此前已发送的验证链接，仅首次加载执行。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legacyToken]);

  async function verifyCredential(value: string) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/verify-email/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(/^\d{6}$/.test(value) ? { code: value } : { token: value }),
      });
      const result = (await response.json()) as { success?: boolean; error?: string; message?: string };
      if (!response.ok || !result.success) {
        setError(result.error || "验证失败，请重新获取验证码。");
        return;
      }
      setVerified(true);
      setMessage(result.message || "邮箱验证成功，欢迎使用 Link168。");
    } catch {
      setError("网络连接失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("请输入邮件中的 6 位数字验证码。");
      return;
    }
    await verifyCredential(code);
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/verify-email", { method: "POST" });
      const result = (await response.json()) as { success?: boolean; error?: string; message?: string; waitSec?: number };
      if (!response.ok || !result.success) {
        setError(result.error || "验证码发送失败，请稍后重试。");
        if (result.waitSec) setCooldown(result.waitSec);
        return;
      }
      setMessage(result.message || "验证码已发送，请检查收件箱或垃圾箱。");
      setCooldown(result.waitSec || 60);
    } catch {
      setError("网络连接失败，请稍后重试。");
    } finally {
      setResending(false);
    }
  }

  if (verified) {
    return (
      <section className="w-full rounded-[28px] border border-[#E8DCCB] bg-white p-7 shadow-[0_24px_70px_rgba(86,68,46,0.12)]">
        <BrandLogo size="header" />
        <div className="mt-7 rounded-2xl bg-[#EEF4E7] p-5 text-center">
          <p className="text-4xl" aria-hidden>✓</p>
          <h1 className="mt-3 text-3xl font-black text-[#2B241E]">邮箱验证成功</h1>
          <p className="mt-3 text-sm leading-7 text-[#4F6D37]">{message}</p>
        </div>
        <button
          type="button"
          onClick={() => router.replace("/dashboard")}
          className="mt-6 flex min-h-12 w-full items-center justify-center rounded-full bg-[#6F8F4E] px-5 font-black text-white"
        >
          进入我的 Link168 后台
        </button>
      </section>
    );
  }

  return (
    <section className="w-full rounded-[28px] border border-[#E8DCCB] bg-white p-7 shadow-[0_24px_70px_rgba(86,68,46,0.12)]">
      <BrandLogo size="header" />
      <h1 className="mt-7 text-3xl font-black text-[#2B241E]">验证你的邮箱</h1>
      <p className="mt-3 text-sm leading-7 text-[#7A6D5E]">
        请输入发送到{email ? <strong className="mx-1 text-[#3F5F31]">{email}</strong> : "注册邮箱"}的 6 位验证码。
        验证码 10 分钟内有效，且只能使用一次。
      </p>

      <form onSubmit={handleVerify} className="mt-6 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-black text-[#3F5F31]">6 位邮箱验证码</span>
          <input
            autoFocus
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="请输入 6 位数字"
            className="h-14 w-full rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-center text-2xl font-black tracking-[0.35em] text-[#2B241E] outline-none focus:border-[#6F8F4E] focus:ring-4 focus:ring-[#6F8F4E]/12"
          />
        </label>

        {message ? <p className="rounded-2xl bg-[#EEF4E7] px-4 py-3 text-sm font-bold text-[#355126]">{message}</p> : null}
        {error ? <p className="rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">{error}</p> : null}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="flex min-h-12 items-center justify-center rounded-full bg-[#6F8F4E] px-5 font-black text-white disabled:cursor-not-allowed disabled:opacity-55"
        >
          {loading ? "正在验证…" : "完成邮箱验证"}
        </button>
      </form>

      <div className="mt-5 flex flex-col items-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={cooldown > 0 || resending}
          className="font-black text-[#3F5F31] disabled:cursor-not-allowed disabled:text-[#A69A8A]"
        >
          {resending ? "正在发送…" : cooldown > 0 ? `${cooldown} 秒后可重新发送` : "重新发送验证码"}
        </button>
        <Link href="/dashboard" className="font-bold text-[#7A6D5E]">稍后验证，先进入后台</Link>
        <Link href="/login" className="font-bold text-[#7A6D5E]">返回登录</Link>
      </div>
    </section>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md items-center overflow-hidden px-4 py-8">
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,#FFFDF8_0%,#F7F1E7_55%,#F2E7D8_100%)]" />
      <Suspense fallback={<p className="w-full rounded-2xl bg-white p-6 text-center">正在加载邮箱验证…</p>}>
        <VerifyEmailForm />
      </Suspense>
    </main>
  );
}
