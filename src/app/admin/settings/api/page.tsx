"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";

type ConfigForm = {
  aiEnabled: boolean;
  aiProvider: string;
  aiBaseUrl: string;
  aiModel: string;
  aiApiKey: string;
  aiDailyLimitTotal: number;
  aiDailyLimitPerUser: number;
  aiTesterEmails: string[];
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

type PageState = {
  loading: boolean;
  saving: boolean;
  error: string;
  success: string;
  notAdmin: boolean;
};

const initialForm: ConfigForm = {
  aiEnabled: false,
  aiProvider: "openai-compatible",
  aiBaseUrl: "https://api.openai.com/v1",
  aiModel: "gpt-4o-mini",
  aiApiKey: "",
  aiDailyLimitTotal: 500,
  aiDailyLimitPerUser: 50,
  aiTesterEmails: [],
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
    <p className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isOk ? "bg-[#E6F0D8] text-[#355126]" : "bg-[#FFF1F0] text-[#B42318]"}`}>
      {value}
    </p>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[#E8DCCB] bg-white/95 p-6 shadow-[0_18px_55px_rgba(86,68,46,0.08)]">
      <h2 className="text-2xl font-black text-[#2B241E]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">{description}</p>
      <div className="mt-6 grid gap-4">{children}</div>
    </section>
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
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-[#EEE4D6] bg-[#FFF9F0] p-4">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#6F8F4E]" />
      <span className="grid gap-1">
        <span className="text-sm font-bold text-[#2B241E]">{label}</span>
        {hint ? <span className="text-xs leading-5 text-[#8B7B68]">{hint}</span> : null}
      </span>
    </label>
  );
}

export default function AdminSettingsApiPage() {
  const router = useRouter();
  const [state, setState] = useState<PageState>({ loading: true, saving: false, error: "", success: "", notAdmin: false });
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

  const assistantToggles = useMemo(
    () => [
      { key: "aiAssistantTaxEnabled" as const, label: "财税 AI Agent" },
      { key: "aiAssistantLegalEnabled" as const, label: "法务 AI Agent" },
      { key: "aiAssistantMarketEnabled" as const, label: "市场调研 AI Agent" },
      { key: "aiAssistantDesignEnabled" as const, label: "设计 AI Agent" },
      { key: "aiAssistantSocialEnabled" as const, label: "社媒运营 AI Agent" },
    ],
    [],
  );

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "", success: "" }));
    try {
      const response = await fetch("/api/admin/settings/api", { cache: "no-store" });
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (response.status === 403) {
        setState((current) => ({ ...current, loading: false, notAdmin: true, error: "当前账号不是超级管理员，无法访问此页面。" }));
        return;
      }

      const result = (await response.json()) as { success?: boolean; config?: ConfigForm; error?: string };
      if (!response.ok || !result.success || !result.config) {
        setState((current) => ({ ...current, loading: false, error: result.error || "加载配置失败" }));
        return;
      }

      setForm({ ...initialForm, ...result.config });
      setAiTesterEmailsText(Array.isArray(result.config.aiTesterEmails) ? result.config.aiTesterEmails.join("\n") : "");
      setState((current) => ({ ...current, loading: false, notAdmin: false, error: "", success: "" }));
    } catch {
      setState((current) => ({ ...current, loading: false, error: "网络错误，无法加载配置" }));
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function updateField<K extends keyof ConfigForm>(key: K, value: ConfigForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submitTest(action: string, options?: { email?: string; statusKey?: keyof TestStatus }) {
    const statusKey = options?.statusKey;
    if (statusKey) {
      setTestStatus((current) => ({ ...current, [statusKey]: "" }));
    }

    const response = await fetch("/api/admin/settings/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, email: options?.email }),
    });

    const result = (await response.json()) as { success?: boolean; message?: string; error?: string };
    const message = result.success ? result.message || "成功" : result.error || "操作失败";
    if (statusKey) {
      setTestStatus((current) => ({ ...current, [statusKey]: message }));
    }
  }

  async function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState((current) => ({ ...current, saving: true, error: "", success: "" }));

    const payload = {
      ...form,
      aiTesterEmails: aiTesterEmailsText
        .split(/[,;\n]/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    };

    try {
      const response = await fetch("/api/admin/settings/api", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { success?: boolean; config?: ConfigForm; error?: string };
      if (!response.ok || !result.success || !result.config) {
        setState((current) => ({ ...current, saving: false, error: result.error || "保存失败" }));
        return;
      }

      setForm({ ...initialForm, ...result.config });
      setAiTesterEmailsText(Array.isArray(result.config.aiTesterEmails) ? result.config.aiTesterEmails.join("\n") : "");
      setState((current) => ({ ...current, saving: false, success: "配置已保存", error: "" }));
    } catch {
      setState((current) => ({ ...current, saving: false, error: "网络错误，保存失败" }));
    }
  }

  if (state.loading) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3">
          <BrandLogo size="header" />
          <Link href="/" className="text-sm font-bold text-[#6F8F4E]">返回首页</Link>
        </header>
        <div className="mt-8 rounded-[24px] border border-[#E8DCCB] bg-white p-6 text-sm font-bold text-[#2B241E] shadow-sm">正在加载超级管理员配置中心…</div>
      </main>
    );
  }

  if (state.notAdmin) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3">
          <BrandLogo size="header" />
          <Link href="/" className="text-sm font-bold text-[#6F8F4E]">返回首页</Link>
        </header>
        <div className="mt-8 rounded-[28px] border border-[#F2C078] bg-[#FFF7E8] p-6 shadow-sm">
          <h1 className="text-2xl font-black text-[#8C612E]">超级管理员权限不足</h1>
          <p className="mt-3 text-sm leading-6 text-[#8C612E]">只有 role=super_admin 的账号可以访问第三方 API 配置中心。普通用户和普通管理员都无法查看完整配置。</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <BrandLogo size="header" />
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm font-bold text-[#6F8F4E]">返回 Dashboard</Link>
          <Link href="/" className="text-sm font-bold text-[#6F8F4E]">返回首页</Link>
        </div>
      </header>

      <section className="mt-8 rounded-[32px] border border-[#E8DCCB] bg-[linear-gradient(180deg,#FFFDF8_0%,#F8F1E7_100%)] p-7 shadow-[0_24px_80px_rgba(86,68,46,0.10)]">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[#6F8F4E]">Super Admin</p>
        <h1 className="mt-3 text-4xl font-black text-[#2B241E]">第三方 API 配置中心</h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-[#6B5D4F]">
          所有第三方 API Key 均由超级管理员手动输入，系统只做加密保存和后端代理调用。前端不会展示完整密钥，普通用户无法访问密钥。内测阶段所有付费 API 默认关闭。
        </p>
        <div className="mt-5 rounded-2xl border border-[#E8DCCB] bg-white/80 p-4 text-xs leading-6 text-[#7A6D5E]">
          <p>以下根密钥仍然只能放在服务器环境变量中，不能通过网页后台配置：`DATABASE_URL`、`SESSION_SECRET`、`ADMIN_SECRET`、`CONFIG_ENCRYPTION_KEY`。</p>
          <p className="mt-2">其中 `CONFIG_ENCRYPTION_KEY` 是加密 AppConfig 敏感字段的根密钥，必须由服务器环境变量提供，不能写入数据库，也不能在网页后台展示。</p>
        </div>
      </section>

      {state.error ? <StatusPill value={state.error} /> : null}
      {state.success ? <StatusPill value={state.success} /> : null}

      <form onSubmit={onSave} className="mt-6 grid gap-6 pb-12">
        <Section title="AI 服务配置" description="统一管理 AI Provider、Base URL、模型、Key、白名单、调用额度与五大 AI Agent 开关。">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ToggleField label="AI 服务总开关" checked={form.aiEnabled} onChange={(value) => updateField("aiEnabled", value)} hint="所有会产生成本的 AI 功能默认关闭，需要老板手动启用。" />
            <TextField label="AI Provider" value={form.aiProvider} onChange={(value) => updateField("aiProvider", value)} placeholder="openai-compatible" hint="支持 OpenAI / DeepSeek / 通义千问 / 豆包 / 智谱 / 自定义 OpenAI-compatible。" />
            <TextField label="AI Base URL" value={form.aiBaseUrl} onChange={(value) => updateField("aiBaseUrl", value)} placeholder="https://api.openai.com/v1" />
            <TextField label="AI Model" value={form.aiModel} onChange={(value) => updateField("aiModel", value)} placeholder="gpt-4o-mini" />
            <TextField label="AI API Key" value={form.aiApiKey} onChange={(value) => updateField("aiApiKey", value)} placeholder="sk-..." hint="只显示脱敏值。若要更新，请输入完整新值；输入包含 **** 的脱敏串会被拒绝保存。" />
            <TextField label="每日总调用上限" type="number" value={form.aiDailyLimitTotal} onChange={(value) => updateField("aiDailyLimitTotal", Number(value) || 500)} />
            <TextField label="单用户每日调用上限" type="number" value={form.aiDailyLimitPerUser} onChange={(value) => updateField("aiDailyLimitPerUser", Number(value) || 50)} />
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-[#2B241E]">测试白名单</span>
            <textarea
              rows={4}
              value={aiTesterEmailsText}
              onChange={(event) => setAiTesterEmailsText(event.target.value)}
              placeholder={"tester1@example.com\ntester2@example.com"}
              className="rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] p-4 text-sm leading-6 text-[#2B241E] outline-none focus:border-[#6F8F4E]"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {assistantToggles.map((item) => (
              <ToggleField
                key={item.key}
                label={item.label}
                checked={form[item.key]}
                onChange={(value) => updateField(item.key, value)}
              />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <TextField label="测试白名单邮箱" value={testEmail} onChange={setTestEmail} placeholder="tester@example.com" />
            <button type="button" onClick={() => void submitTest("test-email", { email: testEmail, statusKey: "whitelist" })} className="min-h-11 rounded-2xl border border-[#D8CCBD] bg-white px-5 text-sm font-bold text-[#2B241E]">
              检查白名单与今日用量
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void submitTest("test-ai-connection", { statusKey: "ai" })} className="min-h-11 rounded-2xl bg-[#6F8F4E] px-5 text-sm font-bold text-white">
              测试 AI 连接
            </button>
            <StatusPill value={testStatus.ai} />
            <StatusPill value={testStatus.whitelist} />
          </div>
        </Section>

        <Section title="邮件 SMTP 配置" description="配置邮件发送能力。当前邮件验证、找回密码等正式发送能力仍建议由服务器环境变量配合验证。">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ToggleField label="邮件服务总开关" checked={form.mailEnabled} onChange={(value) => updateField("mailEnabled", value)} />
            <TextField label="SMTP_HOST" value={form.smtpHost} onChange={(value) => updateField("smtpHost", value)} placeholder="smtp.example.com" />
            <TextField label="SMTP_PORT" type="number" value={form.smtpPort} onChange={(value) => updateField("smtpPort", Number(value) || 465)} />
            <TextField label="SMTP_USER" value={form.smtpUser} onChange={(value) => updateField("smtpUser", value)} placeholder="business@link168.me" />
            <TextField label="SMTP_PASSWORD" value={form.smtpPassword} onChange={(value) => updateField("smtpPassword", value)} placeholder="输入完整新密码" />
            <TextField label="MAIL_FROM" value={form.mailFrom} onChange={(value) => updateField("mailFrom", value)} placeholder="Link168 <business@link168.me>" />
            <TextField label="SSL/TLS 模式" value={form.smtpSecureMode} onChange={(value) => updateField("smtpSecureMode", value)} placeholder="ssl / tls / none" />
            <TextField label="测试收件邮箱" value={mailTestEmail} onChange={setMailTestEmail} placeholder="you@example.com" />
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void submitTest("test-mail", { email: mailTestEmail, statusKey: "mail" })} className="min-h-11 rounded-2xl bg-[#6F8F4E] px-5 text-sm font-bold text-white">
              测试发送邮件
            </button>
            <StatusPill value={testStatus.mail} />
          </div>
        </Section>

        <Section title="支付配置" description="仅做配置预留。7 月 1 日内测版真实支付默认关闭，不接真实支付 API。">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ToggleField label="支付功能总开关" checked={form.paymentEnabled} onChange={(value) => updateField("paymentEnabled", value)} />
            <ToggleField label="微信支付开关" checked={form.paymentWechatEnabled} onChange={(value) => updateField("paymentWechatEnabled", value)} />
            <ToggleField label="支付宝支付开关" checked={form.paymentAlipayEnabled} onChange={(value) => updateField("paymentAlipayEnabled", value)} />
            <ToggleField label="测试模式" checked={form.paymentTestMode} onChange={(value) => updateField("paymentTestMode", value)} hint="内测阶段建议始终保持开启。" />
            <TextField label="商户号" value={form.paymentMerchantId} onChange={(value) => updateField("paymentMerchantId", value)} />
            <TextField label="AppId" value={form.paymentAppId} onChange={(value) => updateField("paymentAppId", value)} />
            <TextField label="API Key" value={form.paymentApiKey} onChange={(value) => updateField("paymentApiKey", value)} placeholder="输入完整新值" />
            <TextField label="证书路径说明" value={form.paymentCertPath} onChange={(value) => updateField("paymentCertPath", value)} placeholder="/secure/certs/..." />
            <TextField label="回调地址" value={form.paymentNotifyUrl} onChange={(value) => updateField("paymentNotifyUrl", value)} placeholder="https://link168.me/api/payment/notify" />
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void submitTest("test-payment", { statusKey: "payment" })} className="min-h-11 rounded-2xl border border-[#D8CCBD] bg-white px-5 text-sm font-bold text-[#2B241E]">
              测试支付配置占位
            </button>
            <StatusPill value={testStatus.payment} />
          </div>
        </Section>

        <Section title="对象存储配置" description="支持 local / aliyun-oss / tencent-cos。若使用云厂商 AccessKey，请务必使用最小权限子账号，不要使用主账号 AccessKey。">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ToggleField label="存储服务总开关" checked={form.storageEnabled} onChange={(value) => updateField("storageEnabled", value)} />
            <TextField label="存储模式" value={form.storageProvider} onChange={(value) => updateField("storageProvider", value)} placeholder="local / aliyun-oss / tencent-cos" />
            <TextField label="Endpoint" value={form.storageEndpoint} onChange={(value) => updateField("storageEndpoint", value)} />
            <TextField label="Bucket" value={form.storageBucket} onChange={(value) => updateField("storageBucket", value)} />
            <TextField label="Region" value={form.storageRegion} onChange={(value) => updateField("storageRegion", value)} />
            <TextField label="AccessKeyId" value={form.storageAccessKeyId} onChange={(value) => updateField("storageAccessKeyId", value)} placeholder="输入完整新值" />
            <TextField label="AccessKeySecret" value={form.storageAccessKeySecret} onChange={(value) => updateField("storageAccessKeySecret", value)} placeholder="输入完整新值" />
            <TextField label="上传目录前缀" value={form.storageUploadPrefix} onChange={(value) => updateField("storageUploadPrefix", value)} placeholder="uploads" />
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void submitTest("test-storage", { statusKey: "storage" })} className="min-h-11 rounded-2xl border border-[#D8CCBD] bg-white px-5 text-sm font-bold text-[#2B241E]">
              测试存储连接
            </button>
            <StatusPill value={testStatus.storage} />
          </div>
        </Section>

        <Section title="短信配置" description="内测版暂不开放真实短信服务，仅做配置预留。">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ToggleField label="短信服务总开关" checked={form.smsEnabled} onChange={(value) => updateField("smsEnabled", value)} />
            <TextField label="Provider" value={form.smsProvider} onChange={(value) => updateField("smsProvider", value)} placeholder="aliyun-sms" />
            <TextField label="AccessKeyId" value={form.smsAccessKeyId} onChange={(value) => updateField("smsAccessKeyId", value)} placeholder="输入完整新值" />
            <TextField label="AccessKeySecret" value={form.smsAccessKeySecret} onChange={(value) => updateField("smsAccessKeySecret", value)} placeholder="输入完整新值" />
            <TextField label="短信签名" value={form.smsSignName} onChange={(value) => updateField("smsSignName", value)} />
            <TextField label="模板 ID" value={form.smsTemplateId} onChange={(value) => updateField("smsTemplateId", value)} />
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void submitTest("test-sms", { statusKey: "sms" })} className="min-h-11 rounded-2xl border border-[#D8CCBD] bg-white px-5 text-sm font-bold text-[#2B241E]">
              测试短信配置占位
            </button>
            <StatusPill value={testStatus.sms} />
          </div>
        </Section>

        <Section title="地图 / 统计 / Webhook / 其他" description="统一收纳地图、统计、Webhook 与自定义第三方接口配置。所有敏感字段只会脱敏展示。">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <TextField label="地图 API Key" value={form.mapApiKey} onChange={(value) => updateField("mapApiKey", value)} placeholder="输入完整新值" />
            <ToggleField label="统计服务开关" checked={form.analyticsEnabled} onChange={(value) => updateField("analyticsEnabled", value)} />
            <TextField label="统计 Provider" value={form.analyticsProvider} onChange={(value) => updateField("analyticsProvider", value)} placeholder="plausible / umami / custom" />
            <TextField label="统计服务 Key" value={form.analyticsKey} onChange={(value) => updateField("analyticsKey", value)} placeholder="输入完整新值" />
            <ToggleField label="Webhook 开关" checked={form.webhookEnabled} onChange={(value) => updateField("webhookEnabled", value)} />
            <TextField label="Webhook URL" value={form.webhookUrl} onChange={(value) => updateField("webhookUrl", value)} placeholder="https://example.com/webhook" />
          </div>
          <label className="grid gap-2">
            <span className="text-sm font-bold text-[#2B241E]">其他自定义 API 配置占位</span>
            <textarea
              rows={5}
              value={form.customApiConfig}
              onChange={(event) => updateField("customApiConfig", event.target.value)}
              placeholder='例如：{"provider":"custom","note":"内测版仅预留"}'
              className="rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] p-4 text-sm leading-6 text-[#2B241E] outline-none focus:border-[#6F8F4E]"
            />
          </label>
        </Section>

        <Section title="超级管理员账号管理" description="只负责提升角色，不展示任何真实密钥。">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <TextField label="提升为超级管理员的邮箱" value={promoteEmail} onChange={setPromoteEmail} placeholder="admin@example.com" />
            <button type="button" onClick={() => void submitTest("promote-super-admin", { email: promoteEmail, statusKey: "promote" })} className="min-h-11 rounded-2xl bg-[#8C612E] px-5 text-sm font-bold text-white">
              提升超级管理员
            </button>
          </div>
          <StatusPill value={testStatus.promote} />
        </Section>

        <div className="flex flex-col gap-3 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-6 text-[#7A6D5E]">
            保存时，敏感字段如果保留脱敏值或包含 <code>****</code>，后端会直接拒绝。若字段留空，则默认保持数据库中已有密钥不变。
          </p>
          <button type="submit" disabled={state.saving} className="min-h-12 rounded-2xl bg-[#6F8F4E] px-6 text-sm font-black text-white disabled:opacity-60">
            {state.saving ? "保存中…" : "保存第三方配置"}
          </button>
        </div>
      </form>
    </main>
  );
}
