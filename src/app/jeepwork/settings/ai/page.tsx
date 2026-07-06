"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { ConfirmModal, type ConfirmModalDangerLevel } from "@/components/admin/ConfirmModal";
import { useJeepworkLogout } from "@/components/admin/useJeepworkLogout";

type AdminUser = { email: string; role: string };

type AiTestResult = {
  success: boolean;
  status?: number;
  model?: string;
  duration?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  requestId?: string;
  error?: string;
  message?: string;
};

export default function JeepworkSettingsAiPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/jeepwork/auth/me", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) router.push("/jeepwork/login");
          return;
        }
        const result = (await response.json()) as { success?: boolean; user?: AdminUser };
        if (!cancelled) {
          if (result.success && result.user) {
            if (result.user.role !== "super_admin") {
              router.push("/jeepwork");
              return;
            }
            setUser(result.user);
          } else {
            router.push("/jeepwork/login");
          }
        }
      } catch {
        if (!cancelled) router.push("/jeepwork/login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const logout = useJeepworkLogout(router);

  return (
    <AdminShell
      currentPageLabel="AI 配置"
      currentUserEmail={user?.email}
      currentUserRole={user?.role}
      onLogout={logout.open}
      pageHeader={{
        eyebrow: "AI Settings",
        title: "AI 服务配置",
        subtitle: "配置 AI 服务商、模型、密钥与功能开关。",
        highlight: "#8B612E",
      }}
    >
      <AiSettingsClient />
      {logout.Modal}
    </AdminShell>
  );
}

type ConfigForm = {
  aiEnabled: boolean;
  aiProvider: string;
  aiBaseUrl: string;
  aiModel: string;
  aiApiKey: string;
  aiBailianAppId: string;
  aiBailianBaseUrl: string;
  aiBailianWorkspaceId: string;
  aiDailyLimitTotal: number;
  aiDailyLimitPerUser: number;
  aiTesterEmails: string[];
  aiRequestTimeout: number;
  aiMaxOutputTokens: number;
  aiTemperature: number;
  aiPublicEnabled: boolean;
  aiAssistantTaxEnabled: boolean;
  aiAssistantLegalEnabled: boolean;
  aiAssistantMarketEnabled: boolean;
  aiAssistantDesignEnabled: boolean;
  aiAssistantSocialEnabled: boolean;
};

const initialForm: ConfigForm = {
  aiEnabled: false,
  aiProvider: "qwen",
  aiBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  aiModel: "qwen-plus",
  aiApiKey: "",
  aiBailianAppId: "",
  aiBailianBaseUrl: "https://dashscope.aliyuncs.com/api/v1",
  aiBailianWorkspaceId: "",
  aiDailyLimitTotal: 500,
  aiDailyLimitPerUser: 50,
  aiTesterEmails: [],
  aiRequestTimeout: 45,
  aiMaxOutputTokens: 1500,
  aiTemperature: 0.3,
  aiPublicEnabled: false,
  aiAssistantTaxEnabled: false,
  aiAssistantLegalEnabled: false,
  aiAssistantMarketEnabled: false,
  aiAssistantDesignEnabled: false,
  aiAssistantSocialEnabled: false,
};

function AiSettingsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<ConfigForm>(initialForm);
  const [aiTesterEmailsText, setAiTesterEmailsText] = useState("");
  const [testResult, setTestResult] = useState<AiTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    dangerLevel: ConfirmModalDangerLevel;
    onConfirm: () => void | Promise<void>;
    onConfirmWithReason?: (reason: string) => void | Promise<void>;
    impactList?: string[];
    irreversibleNotice?: string;
    requireReason?: boolean;
    reasonMinLength?: number;
    reasonPlaceholder?: string;
    inputConfirmMatch?: string;
    inputPlaceholder?: string;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/jeepwork/settings/ai", { cache: "no-store" });
      if (!response.ok) {
        setError("加载配置失败");
        setLoading(false);
        return;
      }
      const result = (await response.json()) as { success?: boolean; data?: { config: ConfigForm } };
      if (result.success !== true || !result.data) {
        setError("加载配置失败");
        setLoading(false);
        return;
      }
      const loaded = { ...initialForm, ...result.data.config };
      setForm(loaded);
      setAiTesterEmailsText(
        Array.isArray(loaded.aiTesterEmails) ? loaded.aiTesterEmails.join("\n") : ""
      );
      setLoading(false);
    } catch {
      setError("网络错误，无法加载配置");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function updateField<K extends keyof ConfigForm>(key: K, value: ConfigForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmModal({
      open: true,
      title: "确认保存配置",
      description: "确定要保存当前配置吗？修改后会立即生效。",
      dangerLevel: "warn",
      impactList: [
        "配置修改后将立即生效",
        "所有 AI 调用将使用新配置",
        "如出现问题可再次修改",
      ],
      onConfirm: async () => {
        setSaving(true);
        setError("");
        setSuccess("");

        const payload = {
          ...form,
          aiTesterEmails: aiTesterEmailsText
            .split(/[,;\n]/)
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean),
        };

        try {
          const response = await fetch("/api/jeepwork/settings/ai", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const result = (await response.json()) as { success?: boolean; data?: unknown; error?: { message?: string } };
          if (!response.ok || result.success !== true) {
            setSaving(false);
            setError(result.error?.message || "保存失败");
            setConfirmModal(null);
            return;
          }
          setSaving(false);
          setSuccess("配置已保存");
          setTestResult(null);
        } catch {
          setSaving(false);
          setError("网络错误，保存失败");
        }
        setConfirmModal(null);
      },
    });
  }

  async function onTestConnection() {
    setTesting(true);
    setTestResult(null);
    setError("");

    try {
      const response = await fetch("/api/jeepwork/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test-ai-connection" }),
      });
      const result = (await response.json()) as { success?: boolean; data?: AiTestResult; error?: { message?: string } };
      setTesting(false);
      if (result.success && result.data) {
        setTestResult(result.data);
      } else {
        setError(result.error?.message || "测试失败");
      }
    } catch {
      setTesting(false);
      setError("网络错误，测试失败");
    }
  }

  if (loading) {
    return (
      <div className="grid gap-6">
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-10 text-center text-sm font-bold text-[#7A6D5E] shadow-sm">
          正在加载 AI 配置…
        </div>
      </div>
    );
  }

  return (
    <>
    <form onSubmit={onSave} className="grid gap-6 pb-12">
      <section className="rounded-[28px] border border-[#E8DCCB] bg-[linear-gradient(180deg,#FFFDF8_0%,#F8F1E7_100%)] p-6 shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[#8B612E]">AI Service</p>
        <h1 className="mt-3 text-3xl font-black text-[#2B241E]">AI 服务配置中心</h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-[#6B5D4F]">
          配置阿里云百炼（Alibaba Bailian）AI 服务。支持通义千问系列模型，默认使用 qwen-plus 模型。
        </p>
      </section>

      {error ? (
        <div className="rounded-2xl border border-[#B42318] bg-[#FFF1F0] px-4 py-3 text-sm font-semibold text-[#B42318]">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-2xl border border-[#6F8F4E] bg-[#E6F0D8] px-4 py-3 text-sm font-semibold text-[#355126]">
          {success}
        </div>
      ) : null}

      {/* 基础配置 */}
      <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black text-[#2B241E]">服务商配置</h2>
        <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">选择 AI 服务商并配置连接信息。</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-[#2B241E]">服务商</span>
            <select
              value={form.aiProvider}
              onChange={(e) => updateField("aiProvider", e.target.value)}
              className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm text-[#2B241E] outline-none focus:border-[#6F8F4E]"
            >
              <option value="qwen">Alibaba Bailian（通义千问）</option>
              <option value="openai-compatible">OpenAI 兼容</option>
              <option value="deepseek">DeepSeek</option>
              <option value="doubao">豆包</option>
              <option value="zhipu">智谱</option>
              <option value="openai">OpenAI</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-[#2B241E]">Base URL</span>
            <input
              type="text"
              value={form.aiBaseUrl}
              onChange={(e) => updateField("aiBaseUrl", e.target.value)}
              placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
              className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm text-[#2B241E] outline-none focus:border-[#6F8F4E]"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-[#2B241E]">默认模型</span>
            <input
              type="text"
              value={form.aiModel}
              onChange={(e) => updateField("aiModel", e.target.value)}
              placeholder="qwen-plus"
              className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm text-[#2B241E] outline-none focus:border-[#6F8F4E]"
            />
            <span className="text-xs text-[#8B7B68]">百炼推荐：qwen-plus、qwen-max、qwen-turbo</span>
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-[#2B241E]">API Key</span>
            <div className="relative">
              <input
                type={apiKeyVisible ? "text" : "password"}
                value={form.aiApiKey}
                onChange={(e) => updateField("aiApiKey", e.target.value)}
                placeholder={form.aiApiKey ? "已配置" : "输入完整新值"}
                className="min-h-11 w-full rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 pr-12 text-sm text-[#2B241E] outline-none focus:border-[#6F8F4E]"
              />
              <button
                type="button"
                onClick={() => setApiKeyVisible(!apiKeyVisible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8B7B68] hover:text-[#2B241E]"
              >
                {apiKeyVisible ? "隐藏" : "显示"}
              </button>
            </div>
            <span className="text-xs text-[#8B7B68]">
              {form.aiApiKey ? "已配置" : "未配置"}
            </span>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-[#2B241E]">请求超时（秒）</span>
            <input
              type="number"
              value={form.aiRequestTimeout}
              onChange={(e) => updateField("aiRequestTimeout", Number(e.target.value) || 45)}
              placeholder="45"
              className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm text-[#2B241E] outline-none focus:border-[#6F8F4E]"
            />
            <span className="text-xs text-[#8B7B68]">范围 10-120 秒</span>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-[#2B241E]">最大输出 Token</span>
            <input
              type="number"
              value={form.aiMaxOutputTokens}
              onChange={(e) => updateField("aiMaxOutputTokens", Number(e.target.value) || 1500)}
              placeholder="1500"
              className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm text-[#2B241E] outline-none focus:border-[#6F8F4E]"
            />
            <span className="text-xs text-[#8B7B68]">范围 100-8000</span>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-[#2B241E]">温度（Temperature）</span>
            <input
              type="number"
              value={form.aiTemperature}
              onChange={(e) => updateField("aiTemperature", Number(e.target.value) || 0.3)}
              placeholder="0.3"
              step="0.1"
              className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm text-[#2B241E] outline-none focus:border-[#6F8F4E]"
            />
            <span className="text-xs text-[#8B7B68]">范围 0-2</span>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-[#2B241E]">每日总调用上限</span>
            <input
              type="number"
              value={form.aiDailyLimitTotal}
              onChange={(e) => updateField("aiDailyLimitTotal", Number(e.target.value) || 500)}
              className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm text-[#2B241E] outline-none focus:border-[#6F8F4E]"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-[#2B241E]">单用户每日调用上限</span>
            <input
              type="number"
              value={form.aiDailyLimitPerUser}
              onChange={(e) => updateField("aiDailyLimitPerUser", Number(e.target.value) || 50)}
              className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm text-[#2B241E] outline-none focus:border-[#6F8F4E]"
            />
          </label>
        </div>
      </section>

      {/* 开关控制 */}
      <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black text-[#2B241E]">功能开关</h2>
        <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">控制 AI 服务的启用状态和访问权限。</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="flex items-start gap-3 rounded-2xl border border-[#EEE4D6] bg-[#FFF9F0] p-4">
            <input
              type="checkbox"
              checked={form.aiEnabled}
              onChange={(e) => updateField("aiEnabled", e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#6F8F4E]"
            />
            <span className="grid gap-1">
              <span className="text-sm font-bold text-[#2B241E]">AI 总开关</span>
              <span className="text-xs leading-5 text-[#8B7B68]">关闭后所有 AI 功能不可用</span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-[#EEE4D6] bg-[#FFF9F0] p-4">
            <input
              type="checkbox"
              checked={form.aiPublicEnabled}
              onChange={(e) => updateField("aiPublicEnabled", e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#6F8F4E]"
            />
            <span className="grid gap-1">
              <span className="text-sm font-bold text-[#2B241E]">公众调用开关</span>
              <span className="text-xs leading-5 text-[#8B7B68]">关闭时仅会员可用</span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-[#EEE4D6] bg-[#FFF9F0] p-4">
            <input
              type="checkbox"
              checked={true}
              disabled
              className="mt-0.5 h-4 w-4 accent-[#6F8F4E]"
            />
            <span className="grid gap-1">
              <span className="text-sm font-bold text-[#7A6D5E]">白名单模式</span>
              <span className="text-xs leading-5 text-[#8B7B68]">默认开启（使用下方白名单）</span>
            </span>
          </label>
        </div>

        <label className="mt-6 grid gap-2">
          <span className="text-sm font-bold text-[#2B241E]">测试白名单邮箱</span>
          <span className="text-xs text-[#8B7B68]">每行一个邮箱，支持逗号、分号或换行分隔</span>
          <textarea
            rows={4}
            value={aiTesterEmailsText}
            onChange={(e) => setAiTesterEmailsText(e.target.value)}
            placeholder="tester1@example.com&#10;tester2@example.com"
            className="rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] p-4 text-sm leading-6 text-[#2B241E] outline-none focus:border-[#6F8F4E]"
          />
        </label>
      </section>

      {/* Agent 开关 */}
      <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black text-[#2B241E]">五大 AI Agent 开关</h2>
        <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">独立控制每个 AI Agent 的启用状态。</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            { key: "aiAssistantTaxEnabled" as const, label: "财税 AI Agent" },
            { key: "aiAssistantLegalEnabled" as const, label: "法务 AI Agent" },
            { key: "aiAssistantMarketEnabled" as const, label: "市场调研 AI Agent" },
            { key: "aiAssistantDesignEnabled" as const, label: "设计 AI Agent" },
            { key: "aiAssistantSocialEnabled" as const, label: "社媒运营 AI Agent" },
          ].map((item) => (
            <label key={item.key} className="flex items-start gap-3 rounded-2xl border border-[#EEE4D6] bg-[#FFF9F0] p-4">
              <input
                type="checkbox"
                checked={form[item.key]}
                onChange={(e) => updateField(item.key, e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#6F8F4E]"
              />
              <span className="grid gap-1">
                <span className="text-sm font-bold text-[#2B241E]">{item.label}</span>
                <span className="text-xs leading-5 text-[#8B7B68]">
                  {form[item.key] ? "已启用" : "已禁用"}
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* 测试连接 */}
      <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black text-[#2B241E]">测试连接</h2>
        <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">验证 AI 服务配置是否正确。</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void onTestConnection()}
            disabled={testing}
            className="min-h-11 rounded-2xl bg-[#8B612E] px-6 text-sm font-bold text-white disabled:opacity-60"
          >
            {testing ? "测试中…" : "测试 AI 连接"}
          </button>
        </div>

        {testResult && (
          <div className="mt-4 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] p-4">
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#2B241E]">状态：</span>
                {testResult.success ? (
                  <span className="rounded-xl bg-[#E6F0D8] px-3 py-1 font-semibold text-[#355126]">成功</span>
                ) : (
                  <span className="rounded-xl bg-[#FFF1F0] px-3 py-1 font-semibold text-[#B42318]">失败</span>
                )}
              </div>
              {testResult.status && (
                <div>
                  <span className="font-bold text-[#2B241E]">HTTP 状态码：</span>
                  <span className="text-[#7A6D5E]">{testResult.status}</span>
                </div>
              )}
              {testResult.model && (
                <div>
                  <span className="font-bold text-[#2B241E]">模型：</span>
                  <span className="text-[#7A6D5E]">{testResult.model}</span>
                </div>
              )}
              {testResult.duration && (
                <div>
                  <span className="font-bold text-[#2B241E]">耗时：</span>
                  <span className="text-[#7A6D5E]">{testResult.duration} ms</span>
                </div>
              )}
              {testResult.totalTokens && (
                <div>
                  <span className="font-bold text-[#2B241E]">Token：</span>
                  <span className="text-[#7A6D5E]">
                    prompt={testResult.promptTokens} / completion={testResult.completionTokens} / total={testResult.totalTokens}
                  </span>
                </div>
              )}
              {testResult.requestId && (
                <div>
                  <span className="font-bold text-[#2B241E]">Request ID：</span>
                  <span className="font-mono text-xs text-[#7A6D5E]">{testResult.requestId}</span>
                </div>
              )}
              {testResult.error && (
                <div>
                  <span className="font-bold text-[#2B241E]">错误：</span>
                  <span className="text-[#B42318]">{testResult.error}</span>
                </div>
              )}
              {testResult.message && !testResult.error && (
                <div>
                  <span className="font-bold text-[#2B241E]">消息：</span>
                  <span className="text-[#7A6D5E]">{testResult.message}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8] p-6 shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[#B42318]">Content Safety</p>
        <h2 className="mt-3 text-2xl font-black text-[#2B241E]">内容安全审核</h2>
        <div className="mt-4 rounded-2xl border border-[#F2C9A5] bg-[#FFF7ED] p-4">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[#9A4E12] px-3 py-1 text-xs font-black text-white">人工复核模式</span>
            <p className="text-sm text-[#9A673F]">当前使用本地启发式审核，图片内容需人工复核。云内容安全服务（阿里云/腾讯云）尚未接入。</p>
          </div>
          <p className="mt-2 text-xs text-[#BA7A31]">
            管理员可在媒体审核后台查看待审核内容并进行批准/拒绝操作。
          </p>
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-6 text-[#7A6D5E]">
          保存时敏感字段（API Key）如果保留脱敏值或包含 **** ，后端会直接拒绝。
        </p>
        <button
          type="submit"
          disabled={saving}
          className="min-h-12 rounded-2xl bg-[#8B612E] px-6 text-sm font-black text-white disabled:opacity-60"
        >
          {saving ? "保存中…" : "保存 AI 配置"}
        </button>
      </div>
    </form>
    {confirmModal && (
      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal(null)}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        dangerLevel={confirmModal.dangerLevel}
        impactList={confirmModal.impactList}
        irreversibleNotice={confirmModal.irreversibleNotice}
        requireReason={confirmModal.requireReason}
        reasonMinLength={confirmModal.reasonMinLength}
        reasonPlaceholder={confirmModal.reasonPlaceholder}
        inputConfirmMatch={confirmModal.inputConfirmMatch}
        inputPlaceholder={confirmModal.inputPlaceholder}
        onConfirmWithReason={confirmModal.onConfirmWithReason}
        loading={saving}
      />
    )}
    </>
  );
}
