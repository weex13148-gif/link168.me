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
    <main className="ui-page flex min-h-dvh items-center py-6 safe-area-pt safe-area-pb sm:py-8">
      <div className="ui-container max-w-md px-4 sm:px-0">
        <section className="ui-surface w-full p-6 sm:p-7">
          <BrandLogo size="header" className="!w-[124px]" />
          <p className="ui-eyebrow mt-7">账户安全</p>
          <h1 className="ui-title mt-3 text-3xl">找回密码</h1>
          <p className="ui-muted mt-3 text-sm leading-7">输入注册邮箱，我们会发送一次性密码重置链接。为保护账号安全，页面不会透露该邮箱是否已经注册。</p>

          {success ? (
            <div className="mt-6 rounded-[var(--ui-radius-sm)] bg-[var(--ui-success-soft)] p-4 text-sm font-bold leading-7 text-[var(--ui-success)]">
              {message}
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-black text-[var(--ui-ink)]">注册邮箱</span>
                <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="请输入注册邮箱" className="ui-input" />
              </label>
              {message ? <p className="rounded-[var(--ui-radius-sm)] bg-[var(--ui-danger-soft)] px-4 py-3 text-sm font-bold text-[var(--ui-danger)]">{message}</p> : null}
              <button type="submit" disabled={loading} className="ui-button-primary min-h-12 w-full text-base disabled:opacity-60">
                {loading ? "正在发送…" : "发送密码重置邮件"}
              </button>
            </form>
          )}

          <div className="mt-6 grid gap-3 border-t border-[var(--ui-line)] pt-5 text-center text-sm">
            {success ? <button type="button" onClick={() => { setSuccess(false); setMessage(""); }} className="font-black text-[var(--ui-brand-hover)]">重新填写邮箱</button> : null}
            <Link href="/login" className="font-bold text-[var(--ui-muted)]">返回登录</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
