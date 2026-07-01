"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

type AuthMode = "login" | "register";
type AuthCardProps = { mode: AuthMode; initialHandle?: string };
type AuthResponse = {
  success?: boolean;
  error?: string;
  redirectTo?: string;
  meta?: { message?: string };
};

const registerBenefits = [
  "创建个人公开主页",
  "添加内容、服务和联系方式",
  "生成可分享的链接与二维码",
];

export function AuthCard({ mode, initialHandle = "" }: AuthCardProps) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (isRegister && password !== confirmPassword) {
      setError("两次输入的密码不一致。");
      return;
    }
    if (isRegister && !agreeTerms) {
      setError("请先阅读并同意用户协议和隐私政策。");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(isRegister ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isRegister ? { email, password, confirmPassword, agreeTerms } : { email, password }),
      });
      const result = await response.json() as AuthResponse;
      if (!response.ok || !result.success) {
        setError(result.error || (isRegister ? "注册失败，请稍后重试。" : "登录失败，请检查邮箱和密码。"));
        return;
      }

      if (isRegister) {
        setSuccess(result.meta?.message || "注册成功，正在进入邮箱验证页面…");
        window.setTimeout(() => {
          router.push(result.redirectTo || `/verify-email?email=${encodeURIComponent(email)}`);
          router.refresh();
        }, 800);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("网络连接失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ui-page flex min-h-dvh items-center py-8 sm:py-12">
      <div className="ui-container grid max-w-4xl overflow-hidden rounded-[var(--ui-radius-xl)] border border-[var(--ui-line)] bg-[var(--ui-surface)] shadow-[var(--ui-shadow-md)] lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="p-6 sm:p-9 lg:p-10">
          <BrandLogo size="header" className="!w-[124px]" />

          <div className="mt-8 max-w-md">
            <p className="ui-eyebrow">{isRegister ? "免费创建主页" : "账户登录"}</p>
            <h1 className="ui-title mt-3 text-3xl sm:text-4xl">{isRegister ? "注册 Link168" : "欢迎回来"}</h1>
            <p className="ui-muted mt-3 leading-7">
              {isRegister
                ? "使用邮箱注册，完成验证后即可编辑你的公开主页。"
                : "登录后继续管理主页资料、链接、主题和二维码。"}
            </p>
            {isRegister && initialHandle ? (
              <p className="mt-3 rounded-[var(--ui-radius-sm)] bg-[var(--ui-brand-soft)] px-4 py-3 text-sm font-bold text-[var(--ui-success)]">
                注册后可在后台确认公开地址：link168.me/{initialHandle}
              </p>
            ) : null}
          </div>

          <form onSubmit={submit} className="mt-7 grid max-w-md gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-black text-[var(--ui-ink)]">邮箱</span>
              <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="请输入常用邮箱" className="ui-input" />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-black text-[var(--ui-ink)]">密码</span>
              <input required minLength={6} type="password" autoComplete={isRegister ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 6 位" className="ui-input" />
            </label>

            {isRegister ? (
              <label className="grid gap-2">
                <span className="text-sm font-black text-[var(--ui-ink)]">确认密码</span>
                <input required minLength={6} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="再次输入密码" className="ui-input" />
              </label>
            ) : null}

            {isRegister ? (
              <label className="flex items-start gap-2 text-sm leading-6 text-[var(--ui-muted)]">
                <input type="checkbox" checked={agreeTerms} onChange={(event) => setAgreeTerms(event.target.checked)} className="mt-1 size-4 accent-[var(--ui-brand)]" />
                <span>
                  我已阅读并同意 <Link href="/terms" className="font-black text-[var(--ui-brand-hover)]">《用户协议》</Link> 和 <Link href="/privacy" className="font-black text-[var(--ui-brand-hover)]">《隐私政策》</Link>
                </span>
              </label>
            ) : null}

            <button type="submit" disabled={loading || (isRegister && !agreeTerms)} className="ui-button-primary min-h-12 w-full text-base disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? <Loader2 className="size-5 animate-spin" /> : null}
              {isRegister ? "注册并验证邮箱" : "登录"}
              {!loading ? <ArrowRight className="size-4" /> : null}
            </button>
          </form>

          {error ? <p className="mt-4 max-w-md rounded-[var(--ui-radius-sm)] bg-[var(--ui-danger-soft)] px-4 py-3 text-sm font-bold text-[var(--ui-danger)]">{error}</p> : null}
          {success ? <p className="mt-4 max-w-md rounded-[var(--ui-radius-sm)] bg-[var(--ui-success-soft)] px-4 py-3 text-sm font-bold text-[var(--ui-success)]">{success}</p> : null}

          <div className="mt-6 max-w-md border-t border-[var(--ui-line)] pt-5 text-center text-sm text-[var(--ui-muted)]">
            {isRegister ? "已经有账号？" : "还没有账号？"}
            <Link href={isRegister ? "/login" : "/register"} className="font-black text-[var(--ui-brand-hover)]">
              {isRegister ? " 去登录" : " 免费注册"}
            </Link>
            {!isRegister ? <span className="mx-2 text-[var(--ui-line)]">|</span> : null}
            {!isRegister ? <Link href="/forgot-password" className="font-black text-[var(--ui-brand-hover)]">忘记密码</Link> : null}
          </div>
        </section>

        <aside className="hidden border-l border-[var(--ui-line)] bg-[var(--ui-surface-muted)] p-8 lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="ui-eyebrow">{isRegister ? "注册后可以完成" : "Link168 账户"}</p>
            <h2 className="ui-title mt-3 text-2xl">{isRegister ? "把客户需要的信息整理到一个页面" : "继续经营你的公开主页"}</h2>
            <p className="ui-muted mt-3 text-sm leading-7">
              {isRegister ? "不需要复杂建站，先完成资料、链接和分享的基础闭环。" : "所有资料和链接修改都会在公开主页中同步展示。"}
            </p>
          </div>

          <ul className="mt-8 grid gap-4 text-sm">
            {registerBenefits.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[var(--ui-brand)] text-white">
                  <Check className="size-3.5" />
                </span>
                <span className="font-bold leading-6 text-[var(--ui-ink)]">{item}</span>
              </li>
            ))}
          </ul>

          <Link href="/" className="mt-10 text-sm font-black text-[var(--ui-brand-hover)] hover:underline">
            返回 Link168 首页
          </Link>
        </aside>
      </div>
    </main>
  );
}
