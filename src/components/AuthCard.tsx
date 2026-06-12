"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Globe2,
  Loader2,
  MessageCircle,
  ShoppingBag,
  Sparkles,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { PhonePreview, type PhonePreviewLink } from "@/components/PhonePreview";
import { normalizeHandle, validateHandle } from "@/lib/handle";

type AuthMode = "login" | "register";

type AuthCardProps = {
  mode: AuthMode;
  initialHandle?: string;
};

type AuthResponse = {
  success?: boolean;
  error?: string;
};

const previewLinks: PhonePreviewLink[] = [
  { id: "wechat", label: "微信公众号", caption: "最新文章和观点" },
  { id: "rednote", label: "小红书", caption: "生活方式和灵感" },
  { id: "douyin", label: "抖音", caption: "短视频内容合集" },
  { id: "channels", label: "视频号", caption: "直播和视频动态" },
  { id: "site", label: "我的网站", caption: "作品、服务和介绍" },
  { id: "shop", label: "商品橱窗", caption: "精选商品入口" },
  { id: "booking", label: "预约咨询", caption: "快速预约时间" },
  { id: "service", label: "微信客服", caption: "一对一沟通" },
  { id: "email", label: "官方邮箱", caption: "商务合作联系" },
];

const floatingItems: Array<{ label: string; icon: LucideIcon; className: string }> = [
  { label: "主页抢占", icon: Globe2, className: "left-6 top-20 bg-white text-[#0B6B2B]" },
  { label: "账号安全", icon: CheckCircle2, className: "right-8 top-32 bg-[#FFF7D6] text-[#AD6800]" },
  { label: "多平台", icon: MessageCircle, className: "left-2 bottom-36 bg-[#ECFDF3] text-[#16A34A]" },
  { label: "商品入口", icon: ShoppingBag, className: "right-4 bottom-24 bg-white text-[#0B6B2B]" },
];

export function AuthCard({ mode, initialHandle = "" }: AuthCardProps) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [handle, setHandle] = useState(() => normalizeHandle(initialHandle));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const previewUsername = useMemo(() => normalizeHandle(handle) || "yourname", [handle]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (isRegister) {
      const handleResult = validateHandle(handle);
      if (!handleResult.success) {
        setMessage(handleResult.error);
        return;
      }

      if (password !== confirmPassword) {
        setMessage("两次输入的密码不一致");
        return;
      }

      if (!agreeTerms) {
        setMessage("请先阅读并同意用户协议和隐私政策");
        return;
      }

      setLoading(true);
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          confirmPassword,
          agreeTerms,
          handle: handleResult.handle,
        }),
      });
      const result = (await response.json()) as AuthResponse;
      setLoading(false);

      if (!response.ok || !result.success) {
        setMessage(result.error || "注册失败，请稍后重试。");
        return;
      }

      router.push("/dashboard");
      router.refresh();
      return;
    }

    setLoading(true);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const result = (await response.json()) as AuthResponse;
    setLoading(false);

    if (!response.ok || !result.success) {
      setMessage(result.error || "登录失败，请检查账号或密码。");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[radial-gradient(circle_at_12%_16%,rgba(250,204,21,0.24),transparent_28%),linear-gradient(135deg,#F7F6EA_0%,#ECFDF3_50%,#FFF7D6_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto grid min-h-[calc(100dvh-48px)] w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/70 bg-white/80 shadow-[0_30px_100px_rgba(11,107,43,0.16)] backdrop-blur lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
        <div className="relative flex flex-col justify-center px-5 py-8 sm:px-8 lg:px-12">
          <div className="absolute -left-16 top-16 size-44 rounded-full bg-[#FACC15]/15 blur-3xl" />
          <div className="relative">
            <BrandLogo size="header" />
            <div className="mt-10 max-w-md">
              <p className="inline-flex items-center gap-2 rounded-full bg-[#ECFDF3] px-3 py-1.5 text-xs font-black text-[#0B6B2B]">
                <Sparkles aria-hidden className="size-4 text-[#F6C343]" />
                {isRegister ? "抢占你的专属主页" : "欢迎回来"}
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-[#113A1D]">
                {isRegister ? "先抢 link168.me/用户名" : "登录 Link168"}
              </h1>
              <p className="mt-3 text-base leading-7 text-[#52624A]">
                {isRegister ? "注册成功后自动进入后台，不需要再登录一次。" : "一个链接，聚合、分享你的全部"}
              </p>
            </div>

            <form onSubmit={onSubmit} className="mt-8 grid max-w-md gap-4">
              {isRegister ? (
                <label className="block">
                  <span className="text-sm font-black text-[#14532D]">链接后缀</span>
                  <div className="mt-2 flex h-12 overflow-hidden rounded-2xl border border-[#DDE8CF] bg-[#FCFFF7] transition focus-within:border-[#16A34A] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#16A34A]/10">
                    <span className="flex shrink-0 items-center border-r border-[#DDE8CF] px-4 text-sm font-black text-[#0B6B2B]">
                      link168.me/
                    </span>
                    <input
                      required
                      value={handle}
                      onChange={(event) => setHandle(event.target.value.toLowerCase())}
                      placeholder="abao"
                      className="min-w-0 flex-1 bg-transparent px-4 text-[#113A1D] outline-none placeholder:text-[#9AA58C]"
                    />
                  </div>
                </label>
              ) : null}

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
                className="link168-button-press flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#FACC15,#F6C343)] px-5 font-black text-[#113A1D] shadow-xl shadow-[#FACC15]/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 aria-hidden className="size-5 animate-spin" /> : null}
                {isRegister ? "立即创建你的 Link168" : "登录"}
                {!loading ? <ArrowRight aria-hidden className="size-5" /> : null}
              </button>
            </form>

            {message ? <p className="mt-4 max-w-md rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">{message}</p> : null}

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
        </div>

        <aside className="relative hidden overflow-hidden bg-[linear-gradient(145deg,#092B17,#0B6B2B_48%,#DDF7C8)] p-8 text-white lg:block">
          <div className="link168-aurora absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(250,204,21,0.42),transparent_24%),radial-gradient(circle_at_80%_18%,rgba(255,255,255,0.28),transparent_22%),radial-gradient(circle_at_58%_82%,rgba(22,163,74,0.36),transparent_26%)]" />
          <div className="absolute -right-20 top-20 size-64 rounded-full bg-[#FACC15]/25 blur-3xl" />
          <div className="absolute bottom-8 left-10 h-28 w-[34rem] -rotate-6 rounded-full border border-white/20" />

          <div className="relative flex h-full flex-col justify-between gap-6">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-black text-[#FFF8D7]">
                <Video aria-hidden className="size-4" />
                Link168 注册预览
              </p>
              <h2 className="mt-4 max-w-md text-4xl font-black leading-tight">抢占后缀，马上拥有公开主页</h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-white/80">
                你的主页地址会同步进入后台资料，并兼容公开访问：link168.me/{previewUsername}
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-sm">
              {floatingItems.map(({ label, icon: Icon, className }, index) => (
                <div
                  key={label}
                  className={`link168-float absolute z-10 hidden items-center gap-2 rounded-2xl px-3 py-2 text-xs font-black shadow-2xl shadow-black/15 xl:flex ${className}`}
                  style={{ animationDelay: `${index * 0.45}s` }}
                >
                  <Icon aria-hidden className="size-4" />
                  {label}
                </div>
              ))}
              <PhonePreview
                variant="auth"
                poweredLogoClickable
                username={previewUsername}
                displayName="Link168 名片"
                bio="一个人，一个链接，连接全网"
                links={previewLinks}
              />
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
