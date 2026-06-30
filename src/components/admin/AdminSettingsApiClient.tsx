"use client";

import { useCallback, useEffect, useState } from "react";

type AdminEnvelope<T> = {
  success?: unknown;
  data?: T | null;
  error?: { code?: string; message?: string } | null;
};

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

  mailEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  mailFrom: string;
  smtpSecureMode: string;

  paymentEnabled: boolean;
  paymentWechatEnabled: boolean;
  paymentAlipayEnabled: boolean;
  paymentMerchantId: string;
  paymentAppId: string;
  paymentApiKey: string;
  paymentCertPath: string;
  paymentNotifyUrl: string;
  paymentTestMode: boolean;

  storageEnabled: boolean;
  storageProvider: string;
  storageEndpoint: string;
  storageBucket: string;
  storageRegion: string;
  storageAccessKeyId: string;
  storageAccessKeySecret: string;
  storageUploadPrefix: string;

  smsEnabled: boolean;
  smsProvider: string;
  smsAccessKeyId: string;
  smsAccessKeySecret: string;
  smsSignName: string;
  smsTemplateId: string;

  mapApiKey: string;
  analyticsEnabled: boolean;
  analyticsProvider: string;
  analyticsKey: string;
  webhookEnabled: boolean;
  webhookUrl: string;
  customApiConfig: string;
};

const initialForm: ConfigForm = {
  aiEnabled: false,
  aiProvider: "bailian",
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

  mailEnabled: false,
  smtpHost: "",
  smtpPort: 465,
  smtpUser: "",
  smtpPassword: "",
  mailFrom: "",
  smtpSecureMode: "ssl",

  paymentEnabled: false,
  paymentWechatEnabled: false,
  paymentAlipayEnabled: false,
  paymentMerchantId: "",
  paymentAppId: "",
  paymentApiKey: "",
  paymentCertPath: "",
  paymentNotifyUrl: "",
  paymentTestMode: true,

  storageEnabled: false,
  storageProvider: "local",
  storageEndpoint: "",
  storageBucket: "",
  storageRegion: "",
  storageAccessKeyId: "",
  storageAccessKeySecret: "",
  storageUploadPrefix: "uploads",

  smsEnabled: false,
  smsProvider: "",
  smsAccessKeyId: "",
  smsAccessKeySecret: "",
  smsSignName: "",
  smsTemplateId: "",

  mapApiKey: "",
  analyticsEnabled: false,
  analyticsProvider: "",
  analyticsKey: "",
  webhookEnabled: false,
  webhookUrl: "",
  customApiConfig: "",
};

type TestStatus = {
  ai: string;
  mail: string;
  storage: string;
  payment: string;
  sms: string;
  whitelist: string;
  promote: string;
};

function StatusPill({ value }: { value: string }) {
  if (!value) return null;
  const isOk = value.startsWith("成功") || value.startsWith("已") || value.startsWith("配置");
  return (
    <p
      className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
        isOk ? "bg-[#E6F0D8] text-[#355126]" : "bg-[#FFF1F0] text-[#B42318]"
      }`}
    >
      {value}
    </p>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-[#2B241E]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm text-[#2B241E] outline-none focus:border-[#6F8F4E]"
      />
      {hint ? <span className="text-xs leading-5 text-[#8B7B68]">{hint}</span> : null}
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
  hint,
  danger,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  danger?: boolean;
}) {
  const borderColor = danger ? "border-[#B42318]" : "border-[#EEE4D6]";
  const bgColor = danger ? "bg-[#FFF1F0]" : "bg-[#FFF9F0]";
  return (
    <label className={`flex items-start gap-3 rounded-2xl border ${borderColor} ${bgColor} p-4`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className={`mt-0.5 h-4 w-4 ${danger ? "accent-[#B42318]" : "accent-[#6F8F4E]"}`}
      />
      <span className="grid gap-1">
        <span className={`text-sm font-bold ${danger ? "text-[#B42318]" : "text-[#2B241E]"}`}>{label}</span>
        {hint ? <span className="text-xs leading-5 text-[#8B7B68]">{hint}</span> : null}
      </span>
    </label>
  );
}

export default function AdminSettingsApiClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<ConfigForm>(initialForm);
  const [aiTesterEmailsText, setAiTesterEmailsText] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [promoteEmail, setPromoteEmail] = useState("");
  const [mailTestEmail, setMailTestEmail] = useState("");
  const [testStatus, setTestStatus] = useState<TestStatus>({
    ai: "",
    mail: "",
    storage: "",
    payment: "",
    sms: "",
    whitelist: "",
    promote: "",
  });

  const assistantToggles = useCallback(
    () => [
      { key: "aiAssistantTaxEnabled" as const, label: "财税 AI Agent" },
      { key: "aiAssistantLegalEnabled" as const, label: "法务 AI Agent" },
      { key: "aiAssistantMarketEnabled" as const, label: "市场调研 AI Agent" },
      { key: "aiAssistantDesignEnabled" as const, label: "设计 AI Agent" },
      { key: "aiAssistantSocialEnabled" as const, label: "社媒运营 AI Agent" },
    ],
    []
  );

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/jeepwork/settings/api", { cache: "no-store" });
      if (!response.ok) {
        setError("加载配置失败");
        setLoading(false);
        return;
      }
      const result = (await response.json()) as AdminEnvelope<ConfigForm>;
      if (result.success !== true || !result.data) {
        setError(result.error?.message || "加载配置失败");
        setLoading(false);
        return;
      }
      setForm({ ...initialForm, ...result.data });
      setAiTesterEmailsText(
        Array.isArray(result.data.aiTesterEmails) ? result.data.aiTesterEmails.join("\n") : ""
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

  async function submitTest(action: string, options?: { email?: string; statusKey?: keyof TestStatus; confirmMessage?: string }) {
    if (options?.confirmMessage) {
      const confirmed = window.confirm(options.confirmMessage);
      if (!confirmed) return;
    }
    const statusKey = options?.statusKey;
    if (statusKey) {
      setTestStatus((current) => ({ ...current, [statusKey]: "" }));
    }

    try {
      const response = await fetch("/api/jeepwork/settings/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, email: options?.email }),
      });

      const result = (await response.json()) as AdminEnvelope<{ message?: string }>;
      if (result.success !== true || !result.data) {
        const message = result.error?.message || "测试失败";
        if (statusKey) {
          setTestStatus((current) => ({ ...current, [statusKey]: message }));
        }
        return;
      }
      const message = result.data.message || "成功";
      if (statusKey) {
        setTestStatus((current) => ({ ...current, [statusKey]: message }));
      }
    } catch {
      if (statusKey) {
        setTestStatus((current) => ({ ...current, [statusKey]: "网络错误，测试失败" }));
      }
    }
  }

  async function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const confirmed = window.confirm("确定要保存当前配置吗？修改后会立即生效。");
    if (!confirmed) return;
    setSaving(true);
    setError("");
    setSuccess("");

    const payload: ConfigForm & { aiTesterEmailsText?: string } = {
      ...form,
      aiTesterEmails: aiTesterEmailsText
        .split(/[,;\n]/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean) as unknown as string[],
    };

    try {
      const response = await fetch("/api/jeepwork/settings/api", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as AdminEnvelope<ConfigForm>;
      if (!response.ok || result.success !== true || !result.data) {
        setSaving(false);
        setError(result.error?.message || "保存失败");
        return;
      }

      setForm({ ...initialForm, ...result.data });
      setAiTesterEmailsText(
        Array.isArray(result.data.aiTesterEmails) ? result.data.aiTesterEmails.join("\n") : ""
      );
      setSaving(false);
      setSuccess("配置已保存");
    } catch {
      setSaving(false);
      setError("网络错误，保存失败");
    }
  }

  if (loading) {
    return (
      <div className="grid gap-6">
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-10 text-center text-sm font-bold text-[#7A6D5E] shadow-sm">
          正在加载配置中心…
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSave} className="grid gap-6 pb-12">
      <section className="rounded-[28px] border border-[#E8DCCB] bg-[linear-gradient(180deg,#FFFDF8_0%,#F8F1E7_100%)] p-6 shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[#6F8F4E]">System</p>
        <h1 className="mt-3 text-3xl font-black text-[#2B241E]">第三方 API 配置中心</h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-[#6B5D4F]">
          所有第三方 API Key 均由超级管理员手动输入，系统只做加密保存和后端代理调用。内测阶段所有付费 API 默认关闭。
        </p>
        <div className="mt-5 rounded-2xl border border-[#E8DCCB] bg-white/80 p-4 text-xs leading-6 text-[#7A6D5E]">
          <p>以下根密钥仍然只能放在服务器环境变量中，不能通过网页后台配置：DATABASE_URL、SESSION_SECRET、ADMIN_SECRET、CONFIG_ENCRYPTION_KEY。</p>
        </div>
      </section>

      {error ? <StatusPill value={error} /> : null}
      {success ? <StatusPill value={success} /> : null}

      <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black text-[#2B241E]">AI 服务配置</h2>
        <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">统一管理 AI Provider、Base URL、模型、Key、白名单、调用额度与五大 AI Agent 开关。</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <TextField label="AI Provider" value={form.aiProvider} onChange={(value) => updateField("aiProvider", value)} placeholder="openai-compatible" hint="支持 OpenAI / DeepSeek / 通义千问 / 豆包 / 智谱 / 自定义。" />
          <TextField label="AI Base URL" value={form.aiBaseUrl} onChange={(value) => updateField("aiBaseUrl", value)} placeholder="https://api.openai.com/v1" />
          <TextField label="AI Model" value={form.aiModel} onChange={(value) => updateField("aiModel", value)} placeholder="gpt-4o-mini" />
          <TextField label="AI API Key" value={form.aiApiKey} onChange={(value) => updateField("aiApiKey", value)} placeholder="sk-..." hint="只显示脱敏值。若要更新，请输入完整新值。" />
          <TextField label="百炼 App ID" value={form.aiBailianAppId} onChange={(value) => updateField("aiBailianAppId", value)} placeholder="app-..." hint="企业 AI 应用接口使用的 App ID。" />
          <TextField label="百炼 App Base URL" value={form.aiBailianBaseUrl} onChange={(value) => updateField("aiBailianBaseUrl", value)} placeholder="https://dashscope.aliyuncs.com/api/v1" hint="默认即百炼应用接口地址。" />
          <TextField label="百炼 Workspace ID" value={form.aiBailianWorkspaceId} onChange={(value) => updateField("aiBailianWorkspaceId", value)} placeholder="可选" />
          <TextField label="请求超时（秒）" type="number" value={form.aiRequestTimeout} onChange={(value) => updateField("aiRequestTimeout", Number(value) || 45)} hint="范围 10-120 秒" />
          <TextField label="最大输出 Token" type="number" value={form.aiMaxOutputTokens} onChange={(value) => updateField("aiMaxOutputTokens", Number(value) || 1500)} hint="范围 100-8000" />
          <TextField label="温度（Temperature）" type="number" value={form.aiTemperature} onChange={(value) => updateField("aiTemperature", Number(value) || 0.3)} hint="范围 0-2" />
          <TextField label="每日总调用上限" type="number" value={form.aiDailyLimitTotal} onChange={(value) => updateField("aiDailyLimitTotal", Number(value) || 500)} />
          <TextField label="单用户每日调用上限" type="number" value={form.aiDailyLimitPerUser} onChange={(value) => updateField("aiDailyLimitPerUser", Number(value) || 50)} />
        </div>

        <label className="mt-6 grid gap-2">
          <span className="text-sm font-bold text-[#2B241E]">测试白名单</span>
          <textarea
            rows={4}
            value={aiTesterEmailsText}
            onChange={(event) => setAiTesterEmailsText(event.target.value)}
            placeholder={"tester1@example.com\ntester2@example.com"}
            className="rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] p-4 text-sm leading-6 text-[#2B241E] outline-none focus:border-[#6F8F4E]"
          />
        </label>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ToggleField label="AI 服务总开关" checked={form.aiEnabled} onChange={(value) => updateField("aiEnabled", value)} hint="所有会产生成本的 AI 功能默认关闭。" />
          <ToggleField label="公众调用开关" checked={form.aiPublicEnabled} onChange={(value) => updateField("aiPublicEnabled", value)} hint="关闭时仅会员可用。" danger={!form.aiPublicEnabled} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assistantToggles().map((item) => (
            <ToggleField key={item.key} label={item.label} checked={form[item.key]} onChange={(value) => updateField(item.key, value)} />
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <TextField label="测试白名单邮箱" value={testEmail} onChange={setTestEmail} placeholder="tester@example.com" />
          <button
            type="button"
            onClick={() => void submitTest("test-email", { email: testEmail, statusKey: "whitelist" })}
            className="min-h-11 rounded-2xl border border-[#D8CCBD] bg-white px-5 text-sm font-bold text-[#2B241E]"
          >
            检查白名单与今日用量
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void submitTest("test-ai-connection", { statusKey: "ai" })}
            className="min-h-11 rounded-2xl bg-[#6F8F4E] px-5 text-sm font-bold text-white"
          >
            测试 AI 连接
          </button>
          <StatusPill value={testStatus.ai} />
          <StatusPill value={testStatus.whitelist} />
        </div>
      </section>

      <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black text-[#2B241E]">邮件 SMTP 配置</h2>
        <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">配置邮件发送能力。邮件验证、找回密码等发送能力建议由服务器环境变量配合验证。</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ToggleField label="邮件服务总开关" checked={form.mailEnabled} onChange={(value) => updateField("mailEnabled", value)} />
          <TextField label="SMTP_HOST" value={form.smtpHost} onChange={(value) => updateField("smtpHost", value)} placeholder="smtp.example.com" />
          <TextField label="SMTP_PORT" type="number" value={form.smtpPort} onChange={(value) => updateField("smtpPort", Number(value) || 465)} />
          <TextField label="SMTP_USER" value={form.smtpUser} onChange={(value) => updateField("smtpUser", value)} placeholder="business@link168.me" />
          <TextField label="SMTP_PASSWORD" value={form.smtpPassword} onChange={(value) => updateField("smtpPassword", value)} placeholder="输入完整新密码" />
          <TextField label="MAIL_FROM" value={form.mailFrom} onChange={(value) => updateField("mailFrom", value)} placeholder="Link168 <business@link168.me>" />
          <TextField label="SSL/TLS 模式" value={form.smtpSecureMode} onChange={(value) => updateField("smtpSecureMode", value)} placeholder="ssl / tls / none" />
          <TextField label="测试收件邮箱" value={mailTestEmail} onChange={setMailTestEmail} placeholder="you@example.com" />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void submitTest("test-mail", { email: mailTestEmail, statusKey: "mail" })}
            className="min-h-11 rounded-2xl bg-[#6F8F4E] px-5 text-sm font-bold text-white"
          >
            测试发送邮件
          </button>
          <StatusPill value={testStatus.mail} />
        </div>
      </section>

      <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black text-[#2B241E]">支付配置</h2>
        <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">仅做配置预留。内测版真实支付默认关闭。</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ToggleField label="支付功能总开关" checked={form.paymentEnabled} onChange={(value) => updateField("paymentEnabled", value)} />
          <ToggleField label="微信支付开关" checked={form.paymentWechatEnabled} onChange={(value) => updateField("paymentWechatEnabled", value)} />
          <ToggleField label="支付宝支付开关" checked={form.paymentAlipayEnabled} onChange={(value) => updateField("paymentAlipayEnabled", value)} />
          <ToggleField label="测试模式" checked={form.paymentTestMode} onChange={(value) => updateField("paymentTestMode", value)} hint="内测阶段建议保持开启。" />
          <TextField label="商户号" value={form.paymentMerchantId} onChange={(value) => updateField("paymentMerchantId", value)} />
          <TextField label="AppId" value={form.paymentAppId} onChange={(value) => updateField("paymentAppId", value)} />
          <TextField label="API Key" value={form.paymentApiKey} onChange={(value) => updateField("paymentApiKey", value)} placeholder="输入完整新值" />
          <TextField label="证书路径说明" value={form.paymentCertPath} onChange={(value) => updateField("paymentCertPath", value)} placeholder="/secure/certs/..." />
          <TextField label="回调地址" value={form.paymentNotifyUrl} onChange={(value) => updateField("paymentNotifyUrl", value)} placeholder="https://link168.me/api/payment/notify" />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void submitTest("test-payment", { statusKey: "payment" })}
            className="min-h-11 rounded-2xl border border-[#D8CCBD] bg-white px-5 text-sm font-bold text-[#2B241E]"
          >
            测试支付配置占位
          </button>
          <StatusPill value={testStatus.payment} />
        </div>
      </section>

      <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black text-[#2B241E]">对象存储配置</h2>
        <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">支持 local / aliyun-oss / tencent-cos。若使用云厂商 AccessKey，请务必使用最小权限子账号。</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ToggleField label="存储服务总开关" checked={form.storageEnabled} onChange={(value) => updateField("storageEnabled", value)} />
          <TextField label="存储模式" value={form.storageProvider} onChange={(value) => updateField("storageProvider", value)} placeholder="local / aliyun-oss / tencent-cos" />
          <TextField label="Endpoint" value={form.storageEndpoint} onChange={(value) => updateField("storageEndpoint", value)} />
          <TextField label="Bucket" value={form.storageBucket} onChange={(value) => updateField("storageBucket", value)} />
          <TextField label="Region" value={form.storageRegion} onChange={(value) => updateField("storageRegion", value)} />
          <TextField label="AccessKeyId" value={form.storageAccessKeyId} onChange={(value) => updateField("storageAccessKeyId", value)} placeholder="输入完整新值" />
          <TextField label="AccessKeySecret" value={form.storageAccessKeySecret} onChange={(value) => updateField("storageAccessKeySecret", value)} placeholder="输入完整新值" />
          <TextField label="上传目录前缀" value={form.storageUploadPrefix} onChange={(value) => updateField("storageUploadPrefix", value)} placeholder="uploads" />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void submitTest("test-storage", { statusKey: "storage" })}
            className="min-h-11 rounded-2xl border border-[#D8CCBD] bg-white px-5 text-sm font-bold text-[#2B241E]"
          >
            测试存储连接
          </button>
          <StatusPill value={testStatus.storage} />
        </div>
      </section>

      <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black text-[#2B241E]">短信配置</h2>
        <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">内测版暂不开放真实短信服务，仅做配置预留。</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ToggleField label="短信服务总开关" checked={form.smsEnabled} onChange={(value) => updateField("smsEnabled", value)} />
          <TextField label="Provider" value={form.smsProvider} onChange={(value) => updateField("smsProvider", value)} placeholder="aliyun-sms" />
          <TextField label="AccessKeyId" value={form.smsAccessKeyId} onChange={(value) => updateField("smsAccessKeyId", value)} placeholder="输入完整新值" />
          <TextField label="AccessKeySecret" value={form.smsAccessKeySecret} onChange={(value) => updateField("smsAccessKeySecret", value)} placeholder="输入完整新值" />
          <TextField label="短信签名" value={form.smsSignName} onChange={(value) => updateField("smsSignName", value)} />
          <TextField label="模板 ID" value={form.smsTemplateId} onChange={(value) => updateField("smsTemplateId", value)} />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void submitTest("test-sms", { statusKey: "sms" })}
            className="min-h-11 rounded-2xl border border-[#D8CCBD] bg-white px-5 text-sm font-bold text-[#2B241E]"
          >
            测试短信配置占位
          </button>
          <StatusPill value={testStatus.sms} />
        </div>
      </section>

      <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black text-[#2B241E]">地图 / 统计 / Webhook / 其他</h2>
        <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">统一收纳地图、统计、Webhook 与自定义第三方接口配置。</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <TextField label="地图 API Key" value={form.mapApiKey} onChange={(value) => updateField("mapApiKey", value)} placeholder="输入完整新值" />
          <ToggleField label="统计服务开关" checked={form.analyticsEnabled} onChange={(value) => updateField("analyticsEnabled", value)} />
          <TextField label="统计 Provider" value={form.analyticsProvider} onChange={(value) => updateField("analyticsProvider", value)} placeholder="plausible / umami / custom" />
          <TextField label="统计服务 Key" value={form.analyticsKey} onChange={(value) => updateField("analyticsKey", value)} placeholder="输入完整新值" />
          <ToggleField label="Webhook 开关" checked={form.webhookEnabled} onChange={(value) => updateField("webhookEnabled", value)} />
          <TextField label="Webhook URL" value={form.webhookUrl} onChange={(value) => updateField("webhookUrl", value)} placeholder="https://example.com/webhook" />
        </div>
        <label className="mt-6 grid gap-2">
          <span className="text-sm font-bold text-[#2B241E]">其他自定义 API 配置占位</span>
          <textarea
            rows={5}
            value={form.customApiConfig}
            onChange={(event) => updateField("customApiConfig", event.target.value)}
            placeholder={'例如：{"provider":"custom","note":"内测版仅预留"}'}
            className="rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] p-4 text-sm leading-6 text-[#2B241E] outline-none focus:border-[#6F8F4E]"
          />
        </label>
      </section>

      <section className="rounded-[28px] border border-[#B42318] bg-[#FFF1F0] p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#B42318]">Danger Zone</p>
        <h2 className="mt-3 text-2xl font-black text-[#2B241E]">超级管理员账号管理</h2>
        <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">
          这是敏感操作。提升角色会授予对应账号访问整个管理后台与配置中心的权限。
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <TextField label="提升为超级管理员的邮箱" value={promoteEmail} onChange={setPromoteEmail} placeholder="admin@example.com" />
          <button
            type="button"
            onClick={() =>
              void submitTest("promote-super-admin", {
                email: promoteEmail,
                statusKey: "promote",
                confirmMessage: `确定要将 ${promoteEmail || "此邮箱"} 提升为超级管理员吗？此操作会授予完整后台访问权限。`,
              })
            }
            className="min-h-11 rounded-2xl bg-[#B42318] px-5 text-sm font-black text-white"
          >
            提升超级管理员
          </button>
        </div>
        <div className="mt-3">
          <StatusPill value={testStatus.promote} />
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-6 text-[#7A6D5E]">保存时，敏感字段如果保留脱敏值或包含 ****，后端会直接拒绝。若字段留空，则默认保持数据库中已有密钥不变。</p>
        <button
          type="submit"
          disabled={saving}
          className="min-h-12 rounded-2xl bg-[#6F8F4E] px-6 text-sm font-black text-white disabled:opacity-60"
        >
          {saving ? "保存中…" : "保存第三方配置"}
        </button>
      </div>
    </form>
  );
}
