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
      <section className="ui-surface w-full p-7">
        <BrandLogo size="header" className="!w-[124px]" />
        <div className="mt-7 rounded-[var(--ui-radius-md)] bg-[var(--ui-success-soft)] p-6 text-center">
          <p className="text-4xl text-[var(--ui-brand)]" aria-hidden>✓</p>
          <h1 className="ui-title mt-3 text-3xl">邮箱验证成功</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--ui-success)]">{message}</p>
        </div>
        <button type="button" onClick={() => router.replace("/dashboard")} className="ui-button-primary mt-6 min-h-12 w-full text-base">
          进入我的 Link168 后台
        </button>
      </section>
    );
  }

  return (
    <section className="ui-surface w-full p-7">
      <BrandLogo size="header" className="!w-[124px]" />
      <p className="ui-eyebrow mt-7">邮箱验证</p>
      <h1 className="ui-title mt-3 text-3xl">输入 6 位验证码</h1>
      <p className="ui-muted mt-3 text-sm leading-7">
        验证码已发送到{email ? <strong className="mx-1 text-[var(--ui-brand-hover)]">{email}</strong> : "注册邮箱"}。
        验证码 10 分钟内有效，且只能使用一次。
      </p>

      <form onSubmit={handleVerify} className="mt-6 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-black text-[var(--ui-ink)]">邮箱验证码</span>
          <input
            autoFocus
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="请输入 6 位数字"
            className="ui-input min-h-14 text-center text-2xl font-black tracking-[0.35em]"
          />
        </label>

        {message ? <p className="rounded-[var(--ui-radius-sm)] bg-[var(--ui-success-soft)] px-4 py-3 text-sm font-bold text-[var(--ui-success)]">{message}</p> : null}
        {error ? <p className="rounded-[var(--ui-radius-sm)] bg-[var(--ui-danger-soft)] px-4 py-3 text-sm font-bold text-[var(--ui-danger)]">{error}</p> : null}

        <button type="submit" disabled={loading || code.length !== 6} className="ui-button-primary min-h-12 w-full text-base disabled:cursor-not-allowed disabled:opacity-55">
          {loading ? "正在验证…" : "完成邮箱验证"}
        </button>
      </form>

      <div className="mt-5 flex flex-col items-center gap-3 border-t border-[var(--ui-line)] pt-5 text-sm">
        <button type="button" onClick={() => void handleResend()} disabled={cooldown > 0 || resending} className="font-black text-[var(--ui-brand-hover)] disabled:cursor-not-allowed disabled:text-[var(--ui-faint)]">
          {resending ? "正在发送…" : cooldown > 0 ? `${cooldown} 秒后可重新发送` : "重新发送验证码"}
        </button>
        <Link href="/dashboard" className="font-bold text-[var(--ui-muted)]">稍后验证，先进入后台</Link>
        <Link href="/login" className="font-bold text-[var(--ui-muted)]">返回登录</Link>
      </div>
    </section>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="ui-page flex min-h-dvh items-center py-8">
      <div className="ui-container max-w-md">
        <Suspense fallback={<p className="ui-surface w-full p-6 text-center">正在加载邮箱验证…</p>}>
          <VerifyEmailForm />
        </Suspense>
      </div>
    </main>
  );
}
