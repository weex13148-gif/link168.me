"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";

type MaskedConfig = {
  aiEnabled: boolean;
  aiBaseUrl: string;
  aiModel: string;
  aiApiKeyMasked: string;
  hasAiApiKey: boolean;
  aiTesterEmails: string[];
  aiDailyLimitPerUser: number;
  emailEnabled: boolean;
  paymentEnabled: boolean;
  storageProvider: "local" | "s3" | "cloudinary";
};

type ApiState = {
  loading: boolean;
  saving: boolean;
  error: string;
  success: string;
  config: MaskedConfig | null;
  isSuperAdmin: boolean;
  notAdmin: boolean;
};

const initialState: ApiState = { loading: true, saving: false, error: "", success: "", config: null, isSuperAdmin: false, notAdmin: false };

export default function AdminSettingsApiPage() {
  const router = useRouter();
  const [state, setState] = useState<ApiState>(initialState);

  const [form, setForm] = useState<{
    aiEnabled: boolean;
    aiBaseUrl: string;
    aiModel: string;
    aiApiKey: string;
    aiTesterEmailsText: string;
    aiDailyLimitPerUser: number;
    emailEnabled: boolean;
    paymentEnabled: boolean;
    storageProvider: string;
  }>({
    aiEnabled: false,
    aiBaseUrl: "",
    aiModel: "",
    aiApiKey: "",
    aiTesterEmailsText: "",
    aiDailyLimitPerUser: 50,
    emailEnabled: false,
    paymentEnabled: false,
    storageProvider: "local",
  });

  const [testEmail, setTestEmail] = useState("");
  const [promoteEmail, setPromoteEmail] = useState("");
  const [testResult, setTestResult] = useState<string>("");
  const [connectionResult, setConnectionResult] = useState<string>("");
  const [promoteResult, setPromoteResult] = useState<string>("");

  async function load() {
    setState((s) => ({ ...s, loading: true, error: "", success: "" }));
    try {
      const response = await fetch("/api/admin/settings/api", { cache: "no-store" });
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (response.status === 403) {
        setState((s) => ({ ...s, loading: false, notAdmin: true, error: "当前账号不是超级管理员，无法访问此页面。" }));
        return;
      }
      const result = (await response.json()) as { success?: boolean; config?: MaskedConfig; error?: string };
      if (!response.ok || !result.success || !result.config) {
        setState((s) => ({ ...s, loading: false, error: result.error || "加载配置失败。" }));
        return;
      }
      const cfg = result.config;
      setState((s) => ({ ...s, loading: false, config: cfg, isSuperAdmin: true }));
      setForm({
        aiEnabled: cfg.aiEnabled,
        aiBaseUrl: cfg.aiBaseUrl,
        aiModel: cfg.aiModel,
        aiApiKey: cfg.aiApiKeyMasked,
        aiTesterEmailsText: cfg.aiTesterEmails.join("\n"),
        aiDailyLimitPerUser: cfg.aiDailyLimitPerUser,
        emailEnabled: cfg.emailEnabled,
        paymentEnabled: cfg.paymentEnabled,
        storageProvider: cfg.storageProvider,
      });
    } catch {
      setState((s) => ({ ...s, loading: false, error: "网络错误，无法加载配置。" }));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState((s) => ({ ...s, saving: true, error: "", success: "" }));

    const testerEmails = form.aiTesterEmailsText
      .split(/[,;\n]/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    const body = {
      aiEnabled: form.aiEnabled,
      aiBaseUrl: form.aiBaseUrl,
      aiModel: form.aiModel,
      aiApiKey: form.aiApiKey,
      aiTesterEmails: testerEmails,
      aiDailyLimitPerUser: Number(form.aiDailyLimitPerUser) || 50,
      emailEnabled: form.emailEnabled,
      paymentEnabled: form.paymentEnabled,
      storageProvider: form.storageProvider,
    };

    try {
      const response = await fetch("/api/admin/settings/api", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as { success?: boolean; config?: MaskedConfig; error?: string };
      if (!response.ok || !result.success) {
        setState((s) => ({ ...s, saving: false, error: result.error || "保存失败。" }));
        return;
      }
      const cfg = result.config!;
      setState((s) => ({ ...s, saving: false, config: cfg, success: "配置已保存。" }));
      setForm((f) => ({ ...f, aiApiKey: cfg.aiApiKeyMasked }));
    } catch {
      setState((s) => ({ ...s, saving: false, error: "网络错误，保存失败。" }));
    }
  }

  async function onTestEmail() {
    setTestResult("");
    const response = await fetch("/api/admin/settings/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test-email", email: testEmail }),
    });
    const result = (await response.json()) as { success?: boolean; isTester?: boolean; email?: string; usage?: { assistant: string; used: number; limit: number; remaining: number }[]; error?: string };
    if (!response.ok || !result.success) {
      setTestResult(`❌ ${result.error || "查询失败"}`);
      return;
    }
    const lines = [];
    lines.push(`✅ 邮箱：${result.email}`);
    lines.push(result.isTester ? "· 状态：已加入 AI 测试白名单" : "· 状态：不在测试白名单中");
    if (result.usage) {
      lines.push("· 今日调用：");
      for (const u of result.usage) {
        lines.push(`  - ${u.assistant}：${u.used}/${u.limit}（剩余 ${u.remaining}）`);
      }
    }
    setTestResult(lines.join("\n"));
  }

  async function onPromote() {
    setPromoteResult("");
    const response = await fetch("/api/admin/settings/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "promote-super-admin", email: promoteEmail }),
    });
    const result = (await response.json()) as { success?: boolean; message?: string; error?: string };
    if (!response.ok || !result.success) {
      setPromoteResult(`❌ ${result.error || "操作失败"}`);
      return;
    }
    setPromoteResult(`✅ ${result.message || "成功"}`);
  }

  async function onTestConnection() {
    setConnectionResult("");
    const response = await fetch("/api/admin/settings/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test-ai-connection" }),
    });
    const result = (await response.json()) as { success?: boolean; message?: string; error?: string };
    if (!response.ok || !result.success) {
      setConnectionResult(`❌ ${result.error || "测试失败"}`);
      return;
    }
    setConnectionResult(`✅ ${result.message || "成功"}`);
  }

  if (state.loading) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <BrandLogo size="header" />
          <Link href="/" className="text-sm font-bold text-[#5B6FFF]">返回首页</Link>
        </header>
        <section className="mt-8 rounded-2xl border border-[#E0E0E0] bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-[#4A4A4A]">正在加载配置...</p>
        </section>
      </main>
    );
  }

  if (state.notAdmin) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <BrandLogo size="header" />
          <Link href="/" className="text-sm font-bold text-[#5B6FFF]">返回首页</Link>
        </header>
        <section className="mt-8 rounded-2xl border border-[#FFB020]/30 bg-[#FFF7E0] p-6 shadow-sm">
          <h1 className="text-2xl font-black text-[#8C612E]">超级管理员权限</h1>
          <p className="mt-3 text-sm leading-6 text-[#8C612E]/90">
            你需要以超级管理员账号登录才能访问此页面。普通用户、普通管理员（使用 ADMIN_SECRET）无法访问。
          </p>
          <p className="mt-2 text-sm font-bold text-[#8C612E]">如需提升，请让现有超级管理员使用下方"提升超级管理员"功能。</p>
        </section>
      </main>
    );
  }

  if (!state.config) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <BrandLogo size="header" />
          <Link href="/" className="text-sm font-bold text-[#5B6FFF]">返回首页</Link>
        </header>
        {state.error ? (
          <p className="mt-8 rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#FF4D4F]">{state.error}</p>
        ) : null}
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between">
        <BrandLogo size="header" />
        <Link href="/" className="text-sm font-bold text-[#5B6FFF]">返回首页</Link>
      </header>

      <section className="mt-8">
        <p className="text-sm font-bold text-[#6F8F4E]">超级管理员</p>
        <h1 className="mt-2 text-4xl font-black">API 配置中心</h1>
        <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">
          在这里管理所有外部 API 与权限配置。敏感信息（如 API Key）以 AES-256 加密存储，前端仅展示脱敏视图。
        </p>
      </section>

      {state.error ? (
        <p className="mt-4 rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#FF4D4F]">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="mt-4 rounded-2xl bg-[#DDE8CD]/80 px-4 py-3 text-sm font-bold text-[#3F5F31]">{state.success}</p>
      ) : null}

      <form onSubmit={onSave} className="mt-6 grid gap-6">
        <section className="rounded-2xl border border-[#E0E0E0] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-[#1A1A1A]">AI 服务</h2>
          <p className="mt-1 text-sm text-[#7A6D5E]">控制五大 AI 机器人的启用与接入。</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-xl bg-[#F5F7FA] p-3 text-sm font-bold text-[#1A1A1A]">
              <input
                type="checkbox"
                checked={form.aiEnabled}
                onChange={(e) => setForm((f) => ({ ...f, aiEnabled: e.target.checked }))}
                className="h-4 w-4 accent-[#6F8F4E]"
              />
              <span>启用 AI 服务</span>
            </label>
            <label className="flex flex-col gap-1 rounded-xl bg-[#F5F7FA] p-3 text-sm font-bold text-[#1A1A1A]">
              <span>存储方式</span>
              <select
                value={form.storageProvider}
                onChange={(e) => setForm((f) => ({ ...f, storageProvider: e.target.value }))}
                className="min-h-9 rounded-lg border border-[#E0E0E0] bg-white px-2 text-sm"
              >
                <option value="local">本地（默认）</option>
                <option value="s3">S3 兼容</option>
                <option value="cloudinary">Cloudinary</option>
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-bold text-[#1A1A1A]">
              <span>AI API Base URL</span>
              <input
                type="text"
                value={form.aiBaseUrl}
                onChange={(e) => setForm((f) => ({ ...f, aiBaseUrl: e.target.value }))}
                placeholder="https://api.openai.com/v1"
                className="min-h-11 rounded-xl border border-[#E0E0E0] bg-white px-3 text-sm outline-none focus:border-[#6F8F4E]"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-bold text-[#1A1A1A]">
              <span>AI 模型名称</span>
              <input
                type="text"
                value={form.aiModel}
                onChange={(e) => setForm((f) => ({ ...f, aiModel: e.target.value }))}
                placeholder="gpt-4o-mini"
                className="min-h-11 rounded-xl border border-[#E0E0E0] bg-white px-3 text-sm outline-none focus:border-[#6F8F4E]"
              />
            </label>
          </div>

          <label className="mt-3 flex flex-col gap-1 text-sm font-bold text-[#1A1A1A]">
            <span>AI API Key</span>
            <input
              type="text"
              value={form.aiApiKey}
              onChange={(e) => setForm((f) => ({ ...f, aiApiKey: e.target.value }))}
              placeholder="sk-..."
              className="min-h-11 rounded-xl border border-[#E0E0E0] bg-white px-3 text-sm outline-none focus:border-[#6F8F4E]"
            />
            <p className="text-xs font-normal text-[#7A6D5E]">
              保存后仅以 <span className="font-bold">{form.aiApiKey || "sk-****abcd"}</span> 形式展示；要更新，请直接输入新的 Key 再保存。
            </p>
          </label>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onTestConnection}
              className="min-h-11 rounded-xl border border-[#E0E0E0] bg-white px-4 text-sm font-black text-[#4A4A4A] hover:bg-[#F5F7FA]"
            >
              测试 AI 连接
            </button>
            {connectionResult ? (
              <p className={`rounded-xl px-3 py-2 text-sm font-bold ${connectionResult.startsWith("✅") ? "bg-[#DDE8CD]/60 text-[#3F5F31]" : "bg-[#FFF1F0] text-[#FF4D4F]"}`}>
                {connectionResult}
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-[#E0E0E0] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-[#1A1A1A]">AI 测试账号白名单</h2>
          <p className="mt-1 text-sm text-[#7A6D5E]">每行一个邮箱（也支持逗号或分号分隔）。只有白名单中的账号可以使用 AI 机器人。</p>

          <label className="mt-5 flex flex-col gap-1 text-sm font-bold text-[#1A1A1A]">
            <span>测试账号邮箱列表</span>
            <textarea
              value={form.aiTesterEmailsText}
              onChange={(e) => setForm((f) => ({ ...f, aiTesterEmailsText: e.target.value }))}
              rows={4}
              placeholder="tester1@example.com&#10;tester2@example.com"
              className="rounded-xl border border-[#E0E0E0] bg-white p-3 text-sm leading-6 outline-none focus:border-[#6F8F4E]"
            />
          </label>

          <label className="mt-4 flex flex-col gap-1 text-sm font-bold text-[#1A1A1A]">
            <span>每账号每日调用上限（1-10000）</span>
            <input
              type="number"
              min={1}
              max={10000}
              value={form.aiDailyLimitPerUser}
              onChange={(e) => setForm((f) => ({ ...f, aiDailyLimitPerUser: Number(e.target.value) || 50 }))}
              className="min-h-11 w-40 rounded-xl border border-[#E0E0E0] bg-white px-3 text-sm outline-none focus:border-[#6F8F4E]"
            />
          </label>

          <div className="mt-5 flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-[#D0D7E3] bg-[#F7F9FB] p-3">
            <label className="flex flex-1 flex-col gap-1 text-sm font-bold text-[#1A1A1A]">
              <span>查询某邮箱是否在白名单，并查看其今日用量</span>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void onTestEmail();
                  }
                }}
                placeholder="tester@example.com"
                className="min-h-11 rounded-xl border border-[#E0E0E0] bg-white px-3 text-sm outline-none focus:border-[#6F8F4E]"
              />
            </label>
            <button type="button" onClick={() => void onTestEmail()} className="min-h-11 rounded-xl bg-[#6F8F4E] px-5 text-sm font-black text-white">
              查询
            </button>
            {testResult ? (
              <pre className="mt-2 w-full whitespace-pre-wrap rounded-xl bg-white p-3 text-sm leading-6 text-[#1A1A1A]">{testResult}</pre>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-[#E0E0E0] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-[#1A1A1A]">其他服务</h2>
          <p className="mt-1 text-sm text-[#7A6D5E]">邮件服务与支付服务的全局开关。</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-xl bg-[#F5F7FA] p-3 text-sm font-bold text-[#1A1A1A]">
              <input
                type="checkbox"
                checked={form.emailEnabled}
                onChange={(e) => setForm((f) => ({ ...f, emailEnabled: e.target.checked }))}
                className="h-4 w-4 accent-[#6F8F4E]"
              />
              <span>启用邮件服务（SMTP）</span>
            </label>

            <label className="flex items-center gap-2 rounded-xl bg-[#F5F7FA] p-3 text-sm font-bold text-[#1A1A1A]">
              <input
                type="checkbox"
                checked={form.paymentEnabled}
                onChange={(e) => setForm((f) => ({ ...f, paymentEnabled: e.target.checked }))}
                className="h-4 w-4 accent-[#6F8F4E]"
              />
              <span>启用支付服务</span>
            </label>
          </div>

          <p className="mt-4 rounded-xl bg-[#FFF7E0] px-3 py-2 text-xs font-bold text-[#8C612E]">
            ⚠️ 支付服务暂未开放真实支付，此开关仅用于标记内测状态。
          </p>
        </section>

        <section className="rounded-2xl border border-[#E0E0E0] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-[#1A1A1A]">超级管理员管理</h2>
          <p className="mt-1 text-sm text-[#7A6D5E]">将某个已注册账号提升为超级管理员。</p>

          <div className="mt-5 flex flex-wrap items-end gap-2">
            <label className="flex flex-1 flex-col gap-1 text-sm font-bold text-[#1A1A1A]">
              <span>邮箱</span>
              <input
                type="email"
                value={promoteEmail}
                onChange={(e) => setPromoteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void onPromote();
                  }
                }}
                placeholder="admin@example.com"
                className="min-h-11 rounded-xl border border-[#E0E0E0] bg-white px-3 text-sm outline-none focus:border-[#6F8F4E]"
              />
            </label>
            <button type="button" onClick={() => void onPromote()} className="min-h-11 rounded-xl border border-[#8C612E] bg-[#FFF7E0] px-5 text-sm font-black text-[#8C612E]">
              提升为超级管理员
            </button>
            {promoteResult ? (
              <p className={`w-full rounded-xl px-3 py-2 text-sm font-bold ${promoteResult.startsWith("✅") ? "bg-[#DDE8CD]/60 text-[#3F5F31]" : "bg-[#FFF1F0] text-[#FF4D4F]"}`}>
                {promoteResult}
              </p>
            ) : null}
          </div>
        </section>

        <div className="flex items-center justify-between gap-3 pb-12">
          <p className="text-xs font-bold text-[#7A6D5E]">
            保存后，前端展示的 API Key 仍然为脱敏形式（例如 sk-****abcd），只有在后端内部才能读取完整值。
          </p>
          <button
            type="submit"
            disabled={state.saving}
            className="min-h-12 rounded-xl bg-[#6F8F4E] px-6 text-sm font-black text-white disabled:opacity-60"
          >
            {state.saving ? "保存中..." : "保存配置"}
          </button>
        </div>
      </form>
    </main>
  );
}
