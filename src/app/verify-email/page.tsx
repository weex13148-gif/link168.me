"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendSuccess, setResendSuccess] = useState(false);
  const [devLink, setDevLink] = useState("");

  useEffect(() => {
    if (tokenFromUrl) void handleVerify();
     
  }, [tokenFromUrl]);

  async function handleVerify() {
    setMessage("");
    setError("");
    setVerified(false);

    if (!token) {
      setError("缺少验证 Token。请从邮箱中的链接访问本页面。");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/verify-email/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
        message?: string;
      };
      setLoading(false);

      if (!response.ok || !result.success) {
        setError(result.error || "验证失败，请稍后重试。");
        return;
      }

      setVerified(true);
      setMessage(result.message || "邮箱验证成功！");
    } catch {
      setLoading(false);
      setError("网络错误，请稍后重试。");
    }
  }

  async function handleResend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResendSuccess(false);
    setDevLink("");

    if (!resendEmail) {
      setError("请输入邮箱地址。");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/verify-email/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resendEmail }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
        devVerifyUrl?: string;
      };
      setLoading(false);

      setResendSuccess(true);
      setMessage(result.message || "如果该邮箱已注册，我们已重新发送验证链接。");
      if (result.devVerifyUrl) setDevLink(result.devVerifyUrl);
    } catch {
      setLoading(false);
      setError("网络错误，请稍后重试。");
    }
  }

  if (verified) {
    return (
      <section className="w-full rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8]/90 p-6 shadow-[0_24px_70px_rgba(86,68,46,0.12)] backdrop-blur">
        <BrandLogo size="header" />
        <h1 className="mt-6 text-3xl font-black text-[#2B241E]">验证成功</h1>
        <div className="mt-6 rounded-2xl bg-[#DDE8CD]/60 p-4 text-sm text-[#3F5F31]">
          {message}
        </div>
        <div className="mt-6 grid gap-3">
          <Link
            href="/dashboard"
            className="link168-button-press inline-flex min-h-12 items-center justify-center rounded-full bg-[#6F8F4E] px-5 font-black text-white shadow-lg shadow-[#6F8F4E]/20 transition hover:-translate-y-0.5 hover:bg-[#5E7F3F]"
          >
            前往我的主页
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#E8DCCB] bg-[#FFFDF8] px-4 font-black text-[#3F5F31]"
          >
            登录
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8]/90 p-6 shadow-[0_24px_70px_rgba(86,68,46,0.12)] backdrop-blur">
      <BrandLogo size="header" />
      <h1 className="mt-6 text-3xl font-black text-[#2B241E]">邮箱验证</h1>
      <p className="mt-3 text-sm leading-7 text-[#7A6D5E]">
        感谢注册 Link168。请在下方完成邮箱验证，以启用所有功能。
      </p>

      <div className="mt-6 grid gap-6">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleVerify();
          }}
          className="grid gap-4"
        >
          <label className="block">
            <span className="text-sm font-black text-[#3F5F31]">验证 Token</span>
            <input
              required
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="从邮箱链接自动填充"
              className="mt-2 h-12 w-full rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] px-4 text-sm text-[#2B241E] outline-none transition placeholder:text-[#A69A8A] focus:border-[#6F8F4E] focus:bg-[#FFFDF8] focus:ring-4 focus:ring-[#6F8F4E]/12"
            />
          </label>

          {error ? (
            <p className="rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">
              {error}
            </p>
          ) : null}

          {message && !verified ? (
            <p className="rounded-2xl bg-[#F6E7C8] px-4 py-3 text-sm font-bold text-[#8C612E]">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="link168-button-press flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#6F8F4E] px-5 font-black text-white shadow-lg shadow-[#6F8F4E]/20 transition hover:-translate-y-0.5 hover:bg-[#5E7F3F] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "验证中..." : "立即验证我的邮箱"}
          </button>
        </form>

        <div className="rounded-2xl border border-dashed border-[#E8DCCB] bg-[#F7F1E7]/60 p-5">
          <p className="text-sm font-black text-[#3F5F31]">没收到邮件？</p>
          <form onSubmit={handleResend} className="mt-4 grid gap-3">
            <label className="block">
              <input
                required
                type="email"
                value={resendEmail}
                onChange={(event) => setResendEmail(event.target.value)}
                placeholder="输入你注册时的邮箱"
                className="h-12 w-full rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-[#2B241E] outline-none transition placeholder:text-[#A69A8A] focus:border-[#6F8F4E] focus:ring-4 focus:ring-[#6F8F4E]/12"
              />
            </label>
            {resendSuccess && message ? (
              <p className="rounded-2xl bg-[#DDE8CD]/60 px-4 py-3 text-sm font-bold text-[#3F5F31]">
                {message}
              </p>
            ) : null}
            {devLink ? (
              <div className="rounded-2xl border border-dashed border-[#E8DCCB] bg-[#FFFDF8] p-4 text-xs text-[#7A6D5E]">
                <p className="font-bold text-[#3F5F31]">开发模式提示：</p>
                <p className="mt-2 break-all">{devLink}</p>
              </div>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="link168-button-press flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#E8DCCB] bg-[#FFFDF8] px-5 font-black text-[#3F5F31] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "发送中..." : "重新发送验证邮件"}
            </button>
          </form>
        </div>
      </div>

      <div className="mt-6 grid gap-3 text-center text-sm">
        <Link href="/login" className="font-black text-[#3F5F31]">
          已验证？返回登录
        </Link>
      </div>
    </section>
  );
}

export default function VerifyEmailPage() {
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
        <VerifyEmailForm />
      </Suspense>
    </main>
  );
}
