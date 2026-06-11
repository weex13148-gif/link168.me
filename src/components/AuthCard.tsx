"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { LogoMark } from "@/components/LogoMark";

type AuthMode = "login" | "register";

export function AuthCard({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isRegister = mode === "register";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (isRegister) {
      if (password !== confirmPassword) {
        setMessage("两次输入的密码不一致。");
        return;
      }

      if (!agreeTerms) {
        setMessage("请先阅读并同意《用户协议》和《隐私政策》。");
        return;
      }

      setLoading(true);
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, agreeTerms }),
      });
      const result = (await response.json()) as { success?: boolean; error?: string };
      setLoading(false);

      if (!response.ok || !result.success) {
        setMessage(result.error || "注册失败，请稍后重试。");
        return;
      }

      setMessage("注册成功，请前往登录页继续。");
      router.push("/login");
      return;
    }

    setLoading(true);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const result = (await response.json()) as { success?: boolean; error?: string };
    setLoading(false);

    if (!response.ok || !result.success) {
      setMessage(result.error || "登录失败，请检查账号或密码。");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-8">
      <section className="w-full max-w-md">
        <LogoMark />
        <div className="mt-6 rounded-lg border border-[#E0E0E0] bg-white p-5 shadow-xl shadow-neutral-900/10 sm:p-7">
          <div>
            <p className="text-sm font-bold text-[#5B6FFF]">{isRegister ? "创建账号" : "欢迎回来"}</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              {isRegister ? "注册 Link1688" : "登录你的主页"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#4A4A4A]">
              {isRegister
                ? "注册后进入后台，创建一个公开主页并添加你的链接。"
                : "登录后进入后台，管理你的资料和链接。"}
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <label className="block">
              <span className="text-sm font-bold text-[#4A4A4A]">账号/邮箱</span>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="mt-2 h-12 w-full rounded-lg border border-[#E0E0E0] bg-[#F5F7FA] px-4 outline-none transition focus:border-[#5B6FFF] focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-[#4A4A4A]">密码</span>
              <input
                required
                minLength={6}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 6 位"
                className="mt-2 h-12 w-full rounded-lg border border-[#E0E0E0] bg-[#F5F7FA] px-4 outline-none transition focus:border-[#5B6FFF] focus:bg-white"
              />
            </label>
            {isRegister ? (
              <label className="block">
                <span className="text-sm font-bold text-[#4A4A4A]">再次输入密码</span>
                <input
                  required
                  minLength={6}
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="再次输入密码"
                  className="mt-2 h-12 w-full rounded-lg border border-[#E0E0E0] bg-[#F5F7FA] px-4 outline-none transition focus:border-[#5B6FFF] focus:bg-white"
                />
              </label>
            ) : null}
            {isRegister ? (
              <label className="flex items-start gap-2 text-sm leading-6 text-[#4A4A4A]">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(event) => setAgreeTerms(event.target.checked)}
                  className="mt-1 size-4 rounded border-[#E0E0E0]"
                />
                <span>
                  我已阅读并同意
                  <Link href="/terms" className="font-bold text-[#5B6FFF]">
                    《用户协议》
                  </Link>
                  和
                  <Link href="/privacy" className="font-bold text-[#5B6FFF]">
                    《隐私政策》
                  </Link>
                </span>
              </label>
            ) : null}
            <button
              type="submit"
              disabled={loading || (isRegister && !agreeTerms)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#5B6FFF] px-4 font-bold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 aria-hidden className="size-5 animate-spin" /> : null}
              {isRegister ? "注册" : "登录"}
              {!loading ? <ArrowRight aria-hidden className="size-5" /> : null}
            </button>
          </form>

          {message ? <p className="mt-4 rounded-lg bg-[#F5F7FA] px-4 py-3 text-sm font-semibold text-[#4A4A4A]">{message}</p> : null}

          <p className="mt-6 text-center text-sm text-[#4A4A4A]">
            {isRegister ? "已经有账号？" : "还没有账号？"}
            <Link href={isRegister ? "/login" : "/register"} className="font-bold text-[#5B6FFF]">
              {isRegister ? " 去登录" : " 去注册"}
            </Link>
          </p>
          {!isRegister ? (
            <p className="mt-3 text-center text-sm">
              <Link href="/forgot-password" className="font-bold text-[#5B6FFF]">
                忘记密码？
              </Link>
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
