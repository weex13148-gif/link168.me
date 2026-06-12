"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

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
    <main className="min-h-dvh overflow-x-hidden bg-[linear-gradient(135deg,#E8F8E8_0%,#FFFBE6_48%,#F7F6EA_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto grid min-h-[calc(100dvh-48px)] w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/70 bg-white/82 shadow-[0_30px_100px_rgba(11,107,43,0.16)] backdrop-blur lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,1.08fr)]">
        <div className="flex flex-col justify-center px-5 py-8 sm:px-8 lg:px-12">
          <BrandLogo size="header" />
          <div className="mt-10 max-w-md">
            <p className="inline-flex items-center gap-2 rounded-full bg-[#ECFDF3] px-3 py-1.5 text-xs font-black text-[#0B6B2B]">
              <Sparkles aria-hidden className="size-4 text-[#F6C343]" />
              {isRegister ? "创建主页" : "欢迎回来"}
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-[#113A1D]">
              {isRegister ? "创建你的 Link168" : "登录 Link168"}
            </h1>
            <p className="mt-3 text-base leading-7 text-[#52624A]">
              {isRegister ? "领取你的专属主页" : "一个链接，聚合、分享你的全部"}
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-8 grid max-w-md gap-4">
            <label className="block">
              <span className="text-sm font-black text-[#14532D]">邮箱</span>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="mt-2 h-12 w-full rounded-2xl border border-[#DDE8CF] bg-[#FCFFF7] px-4 text-[#113A1D] outline-none transition placeholder:text-[#9AA58C] focus:border-[#16A34A] focus:bg-white focus:ring-4 focus:ring-[#16A34A]/10"
              />
            </label>
            <label className="block">
              <span className="text-sm font-black text-[#14532D]">密码</span>
              <input
                required
                minLength={6}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 6 位"
                className="mt-2 h-12 w-full rounded-2xl border border-[#DDE8CF] bg-[#FCFFF7] px-4 text-[#113A1D] outline-none transition placeholder:text-[#9AA58C] focus:border-[#16A34A] focus:bg-white focus:ring-4 focus:ring-[#16A34A]/10"
              />
            </label>
            {isRegister ? (
              <label className="block">
                <span className="text-sm font-black text-[#14532D]">确认密码</span>
                <input
                  required
                  minLength={6}
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="再次输入密码"
                  className="mt-2 h-12 w-full rounded-2xl border border-[#DDE8CF] bg-[#FCFFF7] px-4 text-[#113A1D] outline-none transition placeholder:text-[#9AA58C] focus:border-[#16A34A] focus:bg-white focus:ring-4 focus:ring-[#16A34A]/10"
                />
              </label>
            ) : null}
            {isRegister ? (
              <label className="flex items-start gap-2 text-sm leading-6 text-[#52624A]">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(event) => setAgreeTerms(event.target.checked)}
                  className="mt-1 size-4 rounded border-[#DDE8CF] accent-[#16A34A]"
                />
                <span>
                  我已阅读并同意
                  <Link href="/terms" className="font-black text-[#0B6B2B]">
                    《用户协议》
                  </Link>
                  和
                  <Link href="/privacy" className="font-black text-[#0B6B2B]">
                    《隐私政策》
                  </Link>
                </span>
              </label>
            ) : null}
            <button
              type="submit"
              disabled={loading || (isRegister && !agreeTerms)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#FACC15,#F6C343)] px-5 font-black text-[#113A1D] shadow-xl shadow-[#FACC15]/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 aria-hidden className="size-5 animate-spin" /> : null}
              {isRegister ? "免费注册" : "登录"}
              {!loading ? <ArrowRight aria-hidden className="size-5" /> : null}
            </button>
          </form>

          {message ? <p className="mt-4 max-w-md rounded-2xl bg-[#ECFDF3] px-4 py-3 text-sm font-bold text-[#14532D]">{message}</p> : null}

          <p className="mt-6 max-w-md text-center text-sm text-[#52624A]">
            {isRegister ? "已经有账号？" : "还没有账号？"}
            <Link href={isRegister ? "/login" : "/register"} className="font-black text-[#0B6B2B]">
              {isRegister ? " 去登录" : " 去注册"}
            </Link>
          </p>
          {!isRegister ? (
            <p className="mt-3 max-w-md text-center text-sm">
              <Link href="/forgot-password" className="font-black text-[#0B6B2B]">
                忘记密码？
              </Link>
            </p>
          ) : null}
        </div>

        <aside className="relative hidden overflow-hidden bg-[linear-gradient(145deg,#0B6B2B,#16A34A_58%,#F6C343)] p-10 text-white lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(250,204,21,0.36),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.24),transparent_24%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <p className="text-sm font-black text-[#FFF8D7]">Link168 链接一路发</p>
              <h2 className="mt-4 max-w-md text-4xl font-black leading-tight">一个人，一个链接，连接全网</h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-white/85">
                把公众号、小红书、抖音、视频号、网站和商品入口放进同一个主页，让客户只记住你的一个链接。
              </p>
            </div>

            <div className="mx-auto w-full max-w-sm rounded-[34px] border border-white/25 bg-[#123B20] p-3 shadow-2xl shadow-black/25">
              <div className="rounded-[26px] bg-[#F7F6EA] p-5 text-[#113A1D]">
                <div className="flex items-center gap-3">
                  <div className="grid size-14 place-items-center overflow-hidden rounded-full bg-[#FACC15]">
                    <Image src="/brand/link168-logo.png" alt="Link168 链接一路发" width={76} height={43} className="h-auto w-12 object-contain" />
                  </div>
                  <div>
                    <p className="font-black">Link168 名片</p>
                    <p className="text-xs font-bold text-[#0B6B2B]">link168.me/yourname</p>
                  </div>
                </div>
                {["微信公众号", "小红书", "抖音", "商品橱窗"].map((item) => (
                  <div key={item} className="mt-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm font-black shadow-sm">
                    {item}
                    <CheckCircle2 aria-hidden className="size-4 text-[#16A34A]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
