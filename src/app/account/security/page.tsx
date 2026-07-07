"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";

export default function AccountSecurityPage() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [logoutOtherDevices, setLogoutOtherDevices] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!oldPassword) {
      setError("请输入当前密码。");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError("新密码至少需要 6 位。");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致。");
      return;
    }

    if (oldPassword === newPassword) {
      setError("新密码不能与当前密码相同。");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword, confirmPassword, logoutOtherDevices }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
        message?: string;
      };
      setLoading(false);

      if (!response.ok || !result.success) {
        setError(result.error || "修改失败，请稍后重试。");
        return;
      }

      setMessage(result.message || "密码已修改成功。");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");

      window.setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch {
      setLoading(false);
      setError("网络错误，请稍后重试。");
    }
  }

  return (
    <main className="dark-public relative mx-auto flex min-h-dvh w-full max-w-md items-center overflow-hidden px-4 py-8">
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,#FFFDF8_0%,#F7F1E7_55%,#F2E7D8_100%)]" />
      <div className="absolute left-[-90px] top-24 -z-10 size-48 rounded-full bg-[var(--ui-success-soft)]/70 blur-3xl" />
      <div className="absolute bottom-16 right-[-80px] -z-10 size-56 rounded-full bg-[var(--ui-line)]/80 blur-3xl" />

      <section className="w-full rounded-[28px] border border-[var(--ui-line)] bg-[var(--ui-surface)]/90 p-6 shadow-[var(--ui-shadow-lg)] backdrop-blur">
        <BrandLogo size="header" />
        <h1 className="mt-6 text-3xl font-black text-[var(--ui-ink)]">修改密码</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--ui-muted)]">
          为保障账号安全，请先输入当前密码，再设置新密码。
        </p>

        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <label className="block">
            <span className="text-sm font-black text-[var(--ui-brand)]">当前密码</span>
            <input
              required
              type="password"
              value={oldPassword}
              onChange={(event) => setOldPassword(event.target.value)}
              placeholder="请输入当前密码"
              className="mt-2 h-12 w-full rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface-muted)] px-4 text-[var(--ui-ink)] outline-none transition placeholder:text-[var(--ui-muted)] focus:border-[var(--ui-brand)] focus:bg-[var(--ui-surface)] focus:ring-4 focus:ring-[var(--ui-brand)]/12"
            />
          </label>

          <label className="block">
            <span className="text-sm font-black text-[var(--ui-brand)]">新密码</span>
            <input
              required
              minLength={8}
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="至少 8 位"
              className="mt-2 h-12 w-full rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface-muted)] px-4 text-[var(--ui-ink)] outline-none transition placeholder:text-[var(--ui-muted)] focus:border-[var(--ui-brand)] focus:bg-[var(--ui-surface)] focus:ring-4 focus:ring-[var(--ui-brand)]/12"
            />
          </label>

          <label className="block">
            <span className="text-sm font-black text-[var(--ui-brand)]">再次输入新密码</span>
            <input
              required
              minLength={6}
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="请再次输入新密码"
              className="mt-2 h-12 w-full rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface-muted)] px-4 text-[var(--ui-ink)] outline-none transition placeholder:text-[var(--ui-muted)] focus:border-[var(--ui-brand)] focus:bg-[var(--ui-surface)] focus:ring-4 focus:ring-[var(--ui-brand)]/12"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface-muted)] p-4 cursor-pointer transition hover:bg-[var(--ui-surface)] hover:border-[var(--ui-brand)]">
            <input
              type="checkbox"
              checked={logoutOtherDevices}
              onChange={(event) => setLogoutOtherDevices(event.target.checked)}
              className="size-5 rounded border-[var(--ui-line)] text-[var(--ui-brand)] accent-[var(--ui-brand)]"
            />
            <div>
              <span className="block text-sm font-black text-[var(--ui-ink)]">退出其他设备</span>
              <span className="text-xs text-[var(--ui-muted)]">修改密码后，其他已登录设备将被强制登出</span>
            </div>
          </label>

          {error ? (
            <p className="rounded-2xl bg-[var(--ui-danger-soft)] px-4 py-3 text-sm font-bold text-[var(--ui-danger)]">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="rounded-2xl bg-[var(--ui-success-soft)] px-4 py-3 text-sm font-bold text-[var(--ui-brand)]">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="link168-button-press flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--ui-success)] px-5 font-black text-white shadow-lg shadow-[var(--ui-success)]/20 transition hover:-translate-y-0.5 hover:bg-[var(--ui-success)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "提交中..." : "确认修改"}
          </button>
        </form>

        <div className="mt-6 grid gap-3 text-center text-sm">
          <Link href="/account/sessions" className="font-black text-[var(--ui-brand)]">
            管理已登录设备
          </Link>
          <Link href="/dashboard" className="font-black text-[var(--ui-brand)]">
            返回后台
          </Link>
        </div>
      </section>
    </main>
  );
}
