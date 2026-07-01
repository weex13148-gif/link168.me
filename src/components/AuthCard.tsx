"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { PhonePreview, type PhonePreviewLink } from "@/components/PhonePreview";

type AuthMode = "login" | "register";
type AuthCardProps = { mode: AuthMode; initialHandle?: string };
type AuthResponse = {
  success?: boolean;
  error?: string;
  redirectTo?: string;
  meta?: { message?: string };
};

const previewLinks: PhonePreviewLink[] = [
  { id: "service", label: "AI 网站开发咨询", caption: "了解企业网站与数字化服务" },
  { id: "douyin", label: "抖音：阿宝的创业笔记", caption: "记录一个人用 AI 做产品" },
  { id: "wechat", label: "微信公众号", caption: "查看最新文章和项目进展" },
  { id: "contact", label: "商务合作", caption: "项目合作与服务咨询" },
];

export function AuthCard({ mode }: AuthCardProps) {
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
    <main className="min-h-dvh bg-[linear-gradient(135deg,#FFFDF8_0%,#F7F1E7_52%,#F2E7D8_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto grid min-h-[calc(100dvh-48px)] w-full max-w-6xl overflow-hidden rounded-[32px] border border-[#E8DCCB] bg-[#FFFDF8]/92 shadow-[0_30px_100px_rgba(86,68,46,0.14)] lg:grid-cols-[minmax(0,0.9fr)_minmax(380px,1.1fr)]">
        <div className="flex flex-col justify-center px-5 py-8 sm:px-8 lg:px-12">
          <BrandLogo size="header" />
          <div className="mt-9 max-w-md">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#E8DCCB] bg-[#F7F1E7] px-3 py-1.5 text-xs font-black text-[#3F5F31]">
              <Sparkles className="size-4 text-[#C8A45D]" />
              {isRegister ? "免费创建数字名片" : "欢迎回来"}
            </p>
            <h1 className="mt-4 text-4xl font-black text-[#2B241E]">{isRegister ? "注册 Link168" : "登录 Link168"}</h1>
            <p className="mt-3 text-base leading-7 text-[#7A6D5E]">
              {isRegister
                ? "注册后，你会得到一个可以公开分享的数字名片主页，用来整理内容、服务和客户入口。"
                : "登录后继续编辑你的公开主页、链接和二维码。"}
            </p>
          </div>

          <form onSubmit={submit} className="mt-8 grid max-w-md gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-black text-[#3F5F31]">邮箱</span>
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="请输入常用邮箱" className="h-12 rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] px-4 outline-none focus:border-[#6F8F4E] focus:bg-white" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-black text-[#3F5F31]">密码</span>
              <input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 6 位" className="h-12 rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] px-4 outline-none focus:border-[#6F8F4E] focus:bg-white" />
            </label>
            {isRegister ? (
              <label className="grid gap-2">
                <span className="text-sm font-black text-[#3F5F31]">确认密码</span>
                <input required minLength={6} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="再次输入密码" className="h-12 rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] px-4 outline-none focus:border-[#6F8F4E] focus:bg-white" />
              </label>
            ) : null}
            {isRegister ? (
              <label className="flex items-start gap-2 text-sm leading-6 text-[#7A6D5E]">
                <input type="checkbox" checked={agreeTerms} onChange={(event) => setAgreeTerms(event.target.checked)} className="mt-1 size-4 accent-[#6F8F4E]" />
                <span>我已阅读并同意 <Link href="/terms" className="font-black text-[#3F5F31]">《用户协议》</Link> 和 <Link href="/privacy" className="font-black text-[#3F5F31]">《隐私政策》</Link></span>
              </label>
            ) : null}
            <button type="submit" disabled={loading || (isRegister && !agreeTerms)} className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#6F8F4E] px-5 font-black text-white disabled:opacity-60">
              {loading ? <Loader2 className="size-5 animate-spin" /> : null}
              {isRegister ? "注册并验证邮箱" : "登录"}
              {!loading ? <ArrowRight className="size-5" /> : null}
            </button>
          </form>

          {error ? <p className="mt-4 max-w-md rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">{error}</p> : null}
          {success ? <p className="mt-4 max-w-md rounded-2xl bg-[#EEF4E7] px-4 py-3 text-sm font-bold text-[#355126]">{success}</p> : null}

          <p className="mt-6 max-w-md text-center text-sm text-[#7A6D5E]">
            {isRegister ? "已经有账号？" : "还没有账号？"}
            <Link href={isRegister ? "/login" : "/register"} className="font-black text-[#3F5F31]">{isRegister ? " 去登录" : " 免费注册"}</Link>
          </p>
          {!isRegister ? <p className="mt-3 max-w-md text-center text-sm"><Link href="/forgot-password" className="font-black text-[#3F5F31]">忘记密码？</Link></p> : null}
        </div>

        <aside className="relative hidden overflow-hidden bg-[linear-gradient(145deg,#F7F1E7,#FFFDF8_48%,#DDE8CD_130%)] p-8 lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="inline-flex rounded-full border border-[#E8DCCB] bg-white/80 px-3 py-1.5 text-sm font-black text-[#3F5F31]">注册后你会得到这样的主页</p>
            <h2 className="mt-4 max-w-md text-4xl font-black leading-tight">一个主页，整理你的内容、服务和联系方式</h2>
            <p className="mt-4 text-sm leading-7 text-[#7A6D5E]">示例公开地址：link168.me/abao</p>
          </div>
          <div className="mx-auto w-full max-w-sm">
            <PhonePreview variant="auth" poweredLogoClickable username="abao" displayName="阿宝的名片" bio="记录创业、分享服务，也让客户快速找到我" links={previewLinks} />
          </div>
        </aside>
      </section>
    </main>
  );
}
