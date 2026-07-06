"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AlertTriangle, ArrowRight, Loader2, LockKeyhole, LogOut } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { SiteFooter } from "@/components/SiteFooter";

type DeactivateResponse = {
  success?: boolean;
  error?: string;
};

export default function AccountCancellationPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!password.trim()) {
      setError("请输入当前账号密码。");
      return;
    }

    if (!confirmed) {
      setError("请先确认你了解注销影响。");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          reason: reason.trim() || undefined,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as DeactivateResponse;

      if (!response.ok || !data.success) {
        setError(data.error || "注销失败，请稍后重试。");
        return;
      }

      setPassword("");
      setReason("");
      setConfirmed(false);
      router.replace("/login?deactivated=1");
      router.refresh();
    } catch {
      setError("网络异常，请检查连接后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#FFFEF8] text-[#113A1D]">
      <header className="sticky top-0 z-30 border-b border-[#E7E4D8]/80 bg-[#FFFEF8]/88 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
          <BrandLogo size="header" />
          <Link href="/help" className="text-sm font-bold text-[#0B6B2B] transition hover:text-[#0B7A58]">
            帮助中心
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-black sm:text-4xl">账号注销</h1>
        <p className="mt-3 text-sm leading-7 text-[#52624A]">
          注销会停用当前账号、清除登录会话，并按平台规则处理公开主页和个人资料。请确认风险后再提交。
        </p>

        <section className="mt-8 rounded-[26px] border border-[#DDE8CF] bg-white p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#F59E0B]" />
            <div>
              <h2 className="text-lg font-black">注销前须知</h2>
              <ul className="mt-2 space-y-2 text-sm leading-7 text-[#52624A]">
                <li>注销前需要验证当前账号密码，确保是账号所有者本人操作。</li>
                <li>注销后账号不能继续登录，当前登录会话会被清除。</li>
                <li>公开主页、头像、名称等资料会按系统规则停用或匿名化。</li>
                <li>订单、支付、安全审计等依法或合规需要保留的记录不会被物理删除。</li>
                <li>系统账号、已注销账号或受限制账号会按接口返回的结果处理。</li>
              </ul>
            </div>
          </div>
        </section>

        <form onSubmit={onSubmit} className="mt-6 rounded-[26px] border border-[#DDE8CF] bg-white p-5 sm:p-7">
          <h2 className="text-lg font-black">提交注销请求</h2>

          <label className="mt-5 block">
            <span className="text-sm font-bold text-[#4A4A4A]">当前账号密码</span>
            <div className="mt-2 flex h-12 items-center gap-2 rounded-xl border border-[#E0E0E0] bg-[#F5F7FA] px-4 focus-within:border-[#0B6B2B]">
              <LockKeyhole className="size-4 text-[#8FA083]" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-bold text-[#4A4A4A]">注销原因（可选）</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              className="mt-2 min-h-24 w-full resize-none rounded-xl border border-[#E0E0E0] bg-[#F5F7FA] px-4 py-3 text-sm outline-none focus:border-[#0B6B2B]"
              placeholder="你可以说明注销原因，帮助我们改进产品。"
              disabled={loading}
            />
          </label>

          <label className="mt-4 flex items-start gap-3 rounded-2xl bg-[#FCFFF7] p-4 text-sm leading-6 text-[#52624A]">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-1 size-4 accent-[#0B6B2B]"
              disabled={loading}
            />
            <span>我已了解注销影响，并确认提交账号注销请求。</span>
          </label>

          {error ? (
            <p className="mt-4 rounded-xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">{error}</p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={loading}
              className="link168-button-press inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#B42318] px-6 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="size-5 animate-spin" /> : <LogOut className="size-5" />}
              提交注销
            </button>
            <Link
              href="/account/security"
              className="link168-button-press inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#DDE8CF] bg-white px-6 text-sm font-black text-[#113A1D] transition hover:-translate-y-0.5"
            >
              返回账号安全
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </form>
      </main>

      <SiteFooter />
    </div>
  );
}
