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
    <section className="w-full rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8]/94 p-6 shadow-[0_24px_70px_rgba(86,68,46,0.12)]">
      <BrandLogo size="header" />
      <h1 className="mt-6 text-3xl font-black text-[#2B241E]">设置新密码</h1>
      <p className="mt-3 text-sm leading-7 text-[#7A6D5E]">请输入两次新密码。修改成功后，其他设备上的旧登录状态会失效。</p>

      {!token ? (
        <div className="mt-6 rounded-2xl bg-[#FFF1F0] p-4 text-sm font-bold text-[#B42318]">
          当前重置链接无效或缺少凭证，请重新申请。
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-black text-[#3F5F31]">新密码</span>
            <input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 8 位" className="h-12 rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] px-4 outline-none focus:border-[#6F8F4E] focus:bg-white" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-black text-[#3F5F31]">再次输入新密码</span>
            <input required minLength={8} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="再次输入新密码" className="h-12 rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] px-4 outline-none focus:border-[#6F8F4E] focus:bg-white" />
          </label>

          {error ? <p className="rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">{error}</p> : null}
          {message ? <p className="rounded-2xl bg-[#EEF4E7] px-4 py-3 text-sm font-bold text-[#355126]">{message}</p> : null}

          <button type="submit" disabled={loading} className="h-12 rounded-full bg-[#6F8F4E] px-5 font-black text-white disabled:opacity-60">
            {loading ? "正在修改…" : "确认修改密码"}
          </button>
        </form>
      )}

      <div className="mt-6 grid gap-3 text-center text-sm">
        <Link href="/forgot-password" className="font-black text-[#3F5F31]">重新申请重置邮件</Link>
        <Link href="/login" className="font-bold text-[#7A6D5E]">返回登录</Link>
      </div>
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md items-center overflow-hidden px-4 py-8">
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,#FFFDF8_0%,#F7F1E7_55%,#F2E7D8_100%)]" />
      <Suspense fallback={<section className="w-full rounded-2xl bg-white p-6 text-center">正在加载密码重置页面…</section>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
