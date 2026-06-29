"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, LoaderCircle, MessageCircle, Save, TestTube2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

type ChatConfig = {
  aiEnabled: boolean;
  aiBaseUrl: string;
  aiApiKey: string;
  aiDailyLimitTotal: number;
  aiDailyLimitPerUser: number;
  aiTesterEmails: string[];
};

const initialConfig: ChatConfig = {
  aiEnabled: false,
  aiBaseUrl: "",
  aiApiKey: "",
  aiDailyLimitTotal: 500,
  aiDailyLimitPerUser: 50,
  aiTesterEmails: [],
};

export default function AdminChatSettingsPage() {
  const [config, setConfig] = useState<ChatConfig>(initialConfig);
  const [testerEmails, setTesterEmails] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/settings/chat", { cache: "no-store" });
      const data = (await response.json()) as { success?: boolean; config?: ChatConfig; error?: string };
      if (!response.ok || !data.success || !data.config) {
        setError(data.error || "加载聊天配置失败。不得访问时请确认当前账号为超级管理员。");
        return;
      }
      setConfig({ ...initialConfig, ...data.config });
      setTesterEmails(Array.isArray(data.config.aiTesterEmails) ? data.config.aiTesterEmails.join("\n") : "");
    } catch {
      setError("网络错误，无法加载配置。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/settings/chat", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          aiTesterEmails: testerEmails
            .split(/[,;\n]/)
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean),
        }),
      });
      const data = (await response.json()) as { success?: boolean; config?: ChatConfig; error?: string };
      if (!response.ok || !data.success || !data.config) {
        setError(data.error || "保存失败。");
        return;
      }
      setConfig({ ...initialConfig, ...data.config });
      setTesterEmails(Array.isArray(data.config.aiTesterEmails) ? data.config.aiTesterEmails.join("\n") : "");
      setMessage("配置已安全保存。现在可以测试连接或进入比赛页面聊天。");
    } catch {
      setError("网络错误，保存失败。");
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/settings/chat", { method: "POST" });
      const data = (await response.json()) as { success?: boolean; message?: string; error?: string };
      if (!response.ok || !data.success) {
        setError(data.error || "连接测试失败。");
        return;
      }
      setMessage(data.message || "连接正常。");
    } catch {
      setError("网络错误，连接测试失败。");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#F4F6F1] px-4 text-[#182016]">
        <div className="flex items-center gap-3 rounded-3xl border border-[#DDE4D8] bg-white px-6 py-5 font-black shadow-sm">
          <LoaderCircle className="size-5 animate-spin text-[#587744]" />
          正在加载聊天配置…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#F4F6F1] px-4 py-6 text-[#182016] sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <BrandLogo size="header" />
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/settings/api" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#D6DED1] bg-white px-4 text-sm font-black">
              <ArrowLeft className="size-4" />完整配置中心
            </Link>
            <Link href="/showcase" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#182016] px-4 text-sm font-black text-white">
              <MessageCircle className="size-4" />进入比赛页面
            </Link>
          </div>
        </header>

        <section className="mt-8 rounded-[32px] border border-[#DDE4D8] bg-white p-6 shadow-[0_24px_70px_rgba(24,32,22,0.08)] sm:p-8">
          <p className="text-sm font-black tracking-[0.14em] text-[#587744]">明日测试专用</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.035em] sm:text-5xl">聊天服务快速配置</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#687365] sm:text-base">
            这里只配置比赛页面唯一的 AI 聊天能力。前台只显示 Link168 AI 经营助手，不展示模型名称、服务商或底层接口信息。
          </p>

          {message ? (
            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#E6F0E1] p-4 text-sm font-bold text-[#3F6334]">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="mt-6 rounded-2xl border border-[#E8BEB8] bg-[#FFF1F0] p-4 text-sm font-bold text-[#A43C32]">
              {error}
            </div>
          ) : null}

          <div className="mt-8 grid gap-5">
            <label className="flex items-start gap-3 rounded-2xl border border-[#DDE4D8] bg-[#F7F9F5] p-4">
              <input
                type="checkbox"
                checked={config.aiEnabled}
                onChange={(event) => setConfig((current) => ({ ...current, aiEnabled: event.target.checked }))}
                className="mt-1 size-4 accent-[#587744]"
              />
              <span>
                <span className="block font-black">启用比赛聊天服务</span>
                <span className="mt-1 block text-xs leading-5 text-[#758071]">审核测试前开启；测试结束后可以随时关闭。</span>
              </span>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-black">应用调用地址</span>
              <input
                value={config.aiBaseUrl}
                onChange={(event) => setConfig((current) => ({ ...current, aiBaseUrl: event.target.value }))}
                placeholder="https://.../api/v1/apps/APP_ID/completion"
                className="min-h-12 rounded-2xl border border-[#D6DED1] bg-[#FBFCFA] px-4 text-sm outline-none focus:border-[#587744]"
              />
              <span className="text-xs leading-5 text-[#7A8577]">粘贴完整的 HTTPS 应用调用地址，必须包含应用 ID 和 completion 路径。</span>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-black">API Key</span>
              <input
                type="password"
                value={config.aiApiKey}
                onChange={(event) => setConfig((current) => ({ ...current, aiApiKey: event.target.value }))}
                placeholder="输入完整 API Key；已保存时只显示脱敏值"
                autoComplete="new-password"
                className="min-h-12 rounded-2xl border border-[#D6DED1] bg-[#FBFCFA] px-4 text-sm outline-none focus:border-[#587744]"
              />
              <span className="text-xs leading-5 text-[#7A8577]">密钥仅在服务端加密保存，浏览器不会读取完整值。</span>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-black">测试账号邮箱</span>
              <textarea
                rows={4}
                value={testerEmails}
                onChange={(event) => setTesterEmails(event.target.value)}
                placeholder={"judge@example.com\nyour-account@example.com"}
                className="rounded-2xl border border-[#D6DED1] bg-[#FBFCFA] p-4 text-sm leading-6 outline-none focus:border-[#587744]"
              />
              <span className="text-xs leading-5 text-[#7A8577]">每行一个邮箱。比赛页需要先登录这些账号才能调用聊天服务。</span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-black">每日总调用上限</span>
                <input
                  type="number"
                  min={1}
                  value={config.aiDailyLimitTotal}
                  onChange={(event) => setConfig((current) => ({ ...current, aiDailyLimitTotal: Number(event.target.value) || 1 }))}
                  className="min-h-12 rounded-2xl border border-[#D6DED1] bg-[#FBFCFA] px-4 text-sm outline-none focus:border-[#587744]"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-black">单账号每日上限</span>
                <input
                  type="number"
                  min={1}
                  value={config.aiDailyLimitPerUser}
                  onChange={(event) => setConfig((current) => ({ ...current, aiDailyLimitPerUser: Number(event.target.value) || 1 }))}
                  className="min-h-12 rounded-2xl border border-[#D6DED1] bg-[#FBFCFA] px-4 text-sm outline-none focus:border-[#587744]"
                />
              </label>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || testing}
              className="inline-flex min-h-13 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#587744] px-6 font-black text-white disabled:opacity-50"
            >
              {saving ? <LoaderCircle className="size-5 animate-spin" /> : <Save className="size-5" />}
              保存配置
            </button>
            <button
              type="button"
              onClick={() => void testConnection()}
              disabled={saving || testing}
              className="inline-flex min-h-13 flex-1 items-center justify-center gap-2 rounded-2xl border border-[#C9D7C1] bg-white px-6 font-black text-[#33412F] disabled:opacity-50"
            >
              {testing ? <LoaderCircle className="size-5 animate-spin" /> : <TestTube2 className="size-5" />}
              测试连接
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
