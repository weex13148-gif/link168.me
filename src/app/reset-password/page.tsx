"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!token) {
      setError("重置链接无效，请重新申请忘记密码邮件。");
      return;
    }
    if (password.length < 8) {
      setError("新密码至少需要 8 位。");
      return;
    }
    if (password !== confirmPassword) {
      setError("两次输入的新密码不一致。");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const result = await response.json() as { success?: boolean; error?: string; message?: string; redirectTo?: string };
      if (!response.ok || !result.success) {
        setError(result.error || "密码重置失败，请稍后重试。");
        return;
      }
      setMessage(result.message || "密码修改成功，请使用新密码重新登录。");
      window.setTimeout(() => {
        router.replace(result.redirectTo || "/login?passwordReset=success");
        router.refresh();
      }, 1200);
    } catch {
      setError("网络连接失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ui-surface w-full p-7">
      <BrandLogo size="header" className="!w-[124px]" />
      <p className="ui-eyebrow mt-7">账户安全</p>
      <h1 className="ui-title mt-3 text-3xl">设置新密码</h1>
      <p className="ui-muted mt-3 text-sm leading-7">请输入两次新密码。修改成功后，其他设备上的旧登录状态会失效。</p>

      {!token ? (
        <div className="mt-6 rounded-[var(--ui-radius-sm)] bg-[var(--ui-danger-soft)] p-4 text-sm font-bold text-[var(--ui-danger)]">
          当前重置链接无效或缺少凭证，请重新申请。
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-black text-[var(--ui-ink)]">新密码</span>
            <input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 8 位" className="ui-input" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-black text-[var(--ui-ink)]">再次输入新密码</span>
            <input required minLength={8} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="再次输入新密码" className="ui-input" />
          </label>

          {error ? <p className="rounded-[var(--ui-radius-sm)] bg-[var(--ui-danger-soft)] px-4 py-3 text-sm font-bold text-[var(--ui-danger)]">{error}</p> : null}
          {message ? <p className="rounded-[var(--ui-radius-sm)] bg-[var(--ui-success-soft)] px-4 py-3 text-sm font-bold text-[var(--ui-success)]">{message}</p> : null}

          <button type="submit" disabled={loading} className="ui-button-primary min-h-12 w-full text-base disabled:opacity-60">
            {loading ? "正在修改…" : "确认修改密码"}
          </button>
        </form>
      )}

      <div className="mt-6 grid gap-3 border-t border-[var(--ui-line)] pt-5 text-center text-sm">
        <Link href="/forgot-password" className="font-black text-[var(--ui-brand-hover)]">重新申请重置邮件</Link>
        <Link href="/login" className="font-bold text-[var(--ui-muted)]">返回登录</Link>
      </div>
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="ui-page flex min-h-dvh items-center py-8">
      <div className="ui-container max-w-md">
        <Suspense fallback={<section className="ui-surface w-full p-6 text-center">正在加载密码重置页面…</section>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
