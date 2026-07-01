"use client";

import { useCallback, useEffect, useState } from "react";

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
  mailAppUrl: string;
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

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T | { config?: T; message?: string } | null;
  message?: string;
  error?: { message?: string } | string | null;
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
  smtpHost: "smtpdm.aliyun.com",
  smtpPort: 465,
  smtpUser: "no-reply@notice.link168.me",
  smtpPassword: "",
  mailFrom: "Link168 <no-reply@notice.link168.me>",
  smtpSecureMode: "ssl",
  mailAppUrl: "https://link168.me",
  paymentEnabled: false,
  paymentWechatEnabled: false,
  paymentAlipayEnabled: false,
  paymentMerchantId: "",
  paymentAppId: "",
  paymentApiKey: "",
  paymentCertPath: "",
  paymentNotifyUrl: "https://link168.me/api/payment/notify",
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

const SECRET_KEYS: Array<keyof ConfigForm> = [
  "aiApiKey", "smtpPassword", "paymentApiKey", "storageAccessKeyId", "storageAccessKeySecret",
  "smsAccessKeyId", "smsAccessKeySecret", "mapApiKey", "analyticsKey",
];

function errorText(error: ApiEnvelope<ConfigForm>["error"]) {
  if (typeof error === "string") return error;
  return error?.message || "操作失败，请稍后重试。";
}

function Field({ label, value, onChange, type = "text", placeholder, hint }: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-sm font-black text-[#2B241E]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-11 w-full rounded-xl border border-[#E3D8C8] bg-[#FFFDF8] px-3.5 text-sm text-[#2B241E] outline-none transition focus:border-[#6F8F4E] focus:ring-4 focus:ring-[#6F8F4E]/10"
      />
      {hint ? <span className="text-xs leading-5 text-[#8B7B68]">{hint}</span> : null}
    </label>
  );
}

function SelectField({ label, value, onChange, options, hint }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  hint?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-[#2B241E]">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-xl border border-[#E3D8C8] bg-[#FFFDF8] px-3.5 text-sm outline-none focus:border-[#6F8F4E]">
        {options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
      {hint ? <span className="text-xs leading-5 text-[#8B7B68]">{hint}</span> : null}
    </label>
  );
}

function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (value: boolean) => void; hint?: string }) {
  return (
    <label className="flex min-h-20 cursor-pointer items-start justify-between gap-4 rounded-xl border border-[#E8DCCB] bg-[#FFFDF8] p-4">
      <span>
        <span className="block text-sm font-black text-[#2B241E]">{label}</span>
        {hint ? <span className="mt-1 block text-xs leading-5 text-[#8B7B68]">{hint}</span> : null}
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 size-5 accent-[#6F8F4E]" />
    </label>
  );
}

function Section({ id, title, description, children }: { id?: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 rounded-[24px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-black text-[#2B241E] sm:text-2xl">{title}</h2>
      <p className="mt-2 max-w-5xl text-sm leading-6 text-[#7A6D5E]">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function StatusCard({ label, ok, text }: { label: string; ok: boolean; text: string }) {
  return (
    <div className={`rounded-xl border p-4 ${ok ? "border-[#CFE0BF] bg-[#F2F7ED]" : "border-[#E8DCCB] bg-[#FFF9F0]"}`}>
      <p className="text-xs font-black text-[#7A6D5E]">{label}</p>
      <p className={`mt-1 text-sm font-black ${ok ? "text-[#3F5F31]" : "text-[#8C612E]"}`}>{text}</p>
    </div>
  );
}

export default function AdminSettingsApiClient() {
  const [form, setForm] = useState<ConfigForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mailTestEmail, setMailTestEmail] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [aiTesterEmails, setAiTesterEmails] = useState("");
  const [secretConfigured, setSecretConfigured] = useState<Record<string, boolean>>({});

  function update<K extends keyof ConfigForm>(key: K, value: ConfigForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/jeepwork/settings/api", { cache: "no-store" });
      const result = (await response.json()) as ApiEnvelope<ConfigForm>;
      if (!response.ok || !result.success || !result.data) throw new Error(errorText(result.error));
      const nested = result.data as { config?: ConfigForm };
      const loaded = nested.config || result.data as ConfigForm;
      const configured: Record<string, boolean> = {};
      const safeLoaded = { ...initialForm, ...loaded };
      for (const key of SECRET_KEYS) {
        const raw = String(safeLoaded[key] || "");
        configured[key] = Boolean(raw);
        (safeLoaded as unknown as Record<string, unknown>)[key] = "";
      }
      setSecretConfigured(configured);
      setForm(safeLoaded);
      setAiTesterEmails(Array.isArray(loaded.aiTesterEmails) ? loaded.aiTesterEmails.join("\n") : "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "配置加载失败。" );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const payload = {
        ...form,
        aiTesterEmails: aiTesterEmails.split(/[,;\n]/).map((item) => item.trim().toLowerCase()).filter(Boolean),
      };
      const response = await fetch("/api/jeepwork/settings/api", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as ApiEnvelope<ConfigForm>;
      if (!response.ok || !result.success) throw new Error(errorText(result.error));
      setMessage(result.message || "配置已保存。刷新页面后仍会保留。" );
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "配置保存失败。" );
    } finally {
      setSaving(false);
    }
  }

  async function test(action: string, email?: string) {
    setTestMessage("");
    setError("");
    try {
      const response = await fetch("/api/jeepwork/settings/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, email }),
      });
      const result = await response.json() as ApiEnvelope<ConfigForm>;
      if (!response.ok || !result.success) throw new Error(errorText(result.error));
      const data = result.data as { message?: string } | null;
      setTestMessage(data?.message || result.message || "操作成功。" );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "测试失败。" );
    }
  }

  if (loading) return <div className="rounded-[24px] border border-[#E8DCCB] bg-white p-10 text-center font-bold text-[#7A6D5E]">正在加载系统配置…</div>;

  const mailComplete = Boolean(form.smtpHost && form.smtpUser && (secretConfigured.smtpPassword || form.smtpPassword) && form.mailFrom);
  const mailReady = form.mailEnabled && mailComplete;

  return (
    <form onSubmit={save} className="grid gap-6 pb-24">
      <nav className="flex flex-wrap gap-2 rounded-2xl border border-[#E8DCCB] bg-white p-3 text-sm font-bold shadow-sm">
        <a href="#mail" className="rounded-xl bg-[#EEF4E7] px-4 py-2 text-[#3F5F31]">邮箱验证码</a>
        <a href="#ai" className="rounded-xl px-4 py-2 text-[#6F6255] hover:bg-[#F7F3EC]">AI 配置</a>
        <a href="#payment" className="rounded-xl px-4 py-2 text-[#6F6255] hover:bg-[#F7F3EC]">支付与会员</a>
        <a href="#storage" className="rounded-xl px-4 py-2 text-[#6F6255] hover:bg-[#F7F3EC]">上传与存储</a>
      </nav>

      {message ? <p className="rounded-2xl bg-[#EEF4E7] px-4 py-3 text-sm font-bold text-[#355126]">{message}</p> : null}
      {error ? <p className="rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">{error}</p> : null}

      <Section id="mail" title="邮箱验证码与 SMTP 邮件配置" description="这套配置同时用于注册验证码、重新发送验证码、忘记密码和系统测试邮件。SMTP 测试成功不等于产品闭环完成，下方会显示各功能是否具备发送条件。">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatusCard label="邮件服务总开关" ok={form.mailEnabled} text={form.mailEnabled ? "已开启" : "已关闭"} />
          <StatusCard label="SMTP 配置" ok={mailComplete} text={mailComplete ? "配置完整" : "配置不完整"} />
          <StatusCard label="注册邮箱验证码" ok={mailReady} text={mailReady ? "具备发送条件" : "暂不可用"} />
          <StatusCard label="忘记密码邮件" ok={mailReady} text={mailReady ? "具备发送条件" : "暂不可用"} />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_1fr]">
          <div className="grid gap-4 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] p-5 md:grid-cols-2">
            <div className="md:col-span-2"><Toggle label="邮件服务总开关" checked={form.mailEnabled} onChange={(value) => update("mailEnabled", value)} hint="关闭后注册验证码、重发验证码和忘记密码邮件都不会发送。" /></div>
            <Field label="SMTP 服务器地址" value={form.smtpHost} onChange={(value) => update("smtpHost", value)} placeholder="smtpdm.aliyun.com" />
            <Field label="SMTP 端口" type="number" value={form.smtpPort} onChange={(value) => update("smtpPort", Number(value) || 465)} placeholder="465" />
            <Field label="发信地址" value={form.smtpUser} onChange={(value) => update("smtpUser", value)} placeholder="no-reply@notice.link168.me" />
            <SelectField label="加密方式" value={form.smtpSecureMode} onChange={(value) => update("smtpSecureMode", value)} options={[{ value: "ssl", label: "SSL 加密（推荐，465端口）" }, { value: "tls", label: "TLS 加密" }, { value: "none", label: "不加密" }]} />
            <Field label="SMTP 密码" type="password" value={form.smtpPassword} onChange={(value) => update("smtpPassword", value)} placeholder={secretConfigured.smtpPassword ? "已配置；留空则不修改" : "填写阿里云生成的 SMTP 密码"} hint={secretConfigured.smtpPassword ? "当前密码已安全保存。只有重新输入时才会更新。" : "不是阿里云账号登录密码。"} />
            <Field label="发件人显示名称" value={form.mailFrom} onChange={(value) => update("mailFrom", value)} placeholder="Link168 <no-reply@notice.link168.me>" />
            <div className="md:col-span-2"><Field label="网站正式地址" value={form.mailAppUrl} onChange={(value) => update("mailAppUrl", value)} placeholder="https://link168.me" hint="忘记密码链接等邮件中的网站地址。" /></div>
          </div>

          <div className="grid content-start gap-4">
            <div className="rounded-2xl border border-[#D8E4CC] bg-[#F4F8F0] p-5 text-sm leading-7 text-[#4F633F]">
              <p className="font-black text-[#355126]">阿里云邮件推送填写说明</p>
              <p className="mt-2">阿里云邮件推送控制台 → 发信地址 → <strong>no-reply@notice.link168.me</strong> → 设置 SMTP 密码 → 将生成的密码填写到左侧。</p>
              <p className="mt-2">推荐配置：smtpdm.aliyun.com、465 端口、SSL 加密。</p>
            </div>
            <div className="rounded-2xl border border-[#E8DCCB] bg-white p-5">
              <p className="font-black text-[#2B241E]">发送测试邮件</p>
              <p className="mt-1 text-xs leading-5 text-[#8B7B68]">请先保存配置，再发送测试邮件。</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <input type="email" value={mailTestEmail} onChange={(event) => setMailTestEmail(event.target.value)} placeholder="测试收件邮箱" className="min-h-11 rounded-xl border border-[#E3D8C8] px-3.5 text-sm outline-none focus:border-[#6F8F4E]" />
                <button type="button" onClick={() => void test("test-mail", mailTestEmail)} className="min-h-11 rounded-xl bg-[#6F8F4E] px-5 text-sm font-black text-white">发送测试邮件</button>
              </div>
              {testMessage ? <p className="mt-3 rounded-xl bg-[#EEF4E7] px-3 py-2 text-sm font-bold text-[#355126]">{testMessage}</p> : null}
            </div>
          </div>
        </div>
      </Section>

      <Section id="ai" title="AI 服务配置" description="配置百炼应用、调用额度和各 AI 助手开关。普通免费用户仍由服务端权限控制，不会产生真实 AI 调用。">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Toggle label="AI 服务总开关" checked={form.aiEnabled} onChange={(value) => update("aiEnabled", value)} />
          <Toggle label="公众调用开关" checked={form.aiPublicEnabled} onChange={(value) => update("aiPublicEnabled", value)} hint="V1 建议关闭，仅向付费会员和测试白名单开放。" />
          <SelectField label="AI 服务商" value={form.aiProvider} onChange={(value) => update("aiProvider", value)} options={[{ value: "bailian", label: "阿里云百炼应用" }, { value: "openai-compatible", label: "OpenAI 兼容接口" }, { value: "deepseek", label: "DeepSeek" }, { value: "qwen", label: "通义千问" }]} />
          <Field label="百炼应用 App ID" value={form.aiBailianAppId} onChange={(value) => update("aiBailianAppId", value)} />
          <Field label="百炼应用接口地址" value={form.aiBailianBaseUrl} onChange={(value) => update("aiBailianBaseUrl", value)} />
          <Field label="百炼工作空间 ID" value={form.aiBailianWorkspaceId} onChange={(value) => update("aiBailianWorkspaceId", value)} placeholder="可选" />
          <Field label="AI API Key" type="password" value={form.aiApiKey} onChange={(value) => update("aiApiKey", value)} placeholder={secretConfigured.aiApiKey ? "已配置；留空则不修改" : "填写完整密钥"} />
          <Field label="每日总调用上限" type="number" value={form.aiDailyLimitTotal} onChange={(value) => update("aiDailyLimitTotal", Number(value) || 500)} />
          <Field label="单用户每日调用上限" type="number" value={form.aiDailyLimitPerUser} onChange={(value) => update("aiDailyLimitPerUser", Number(value) || 50)} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Toggle label="财税 AI" checked={form.aiAssistantTaxEnabled} onChange={(value) => update("aiAssistantTaxEnabled", value)} />
          <Toggle label="法务 AI" checked={form.aiAssistantLegalEnabled} onChange={(value) => update("aiAssistantLegalEnabled", value)} />
          <Toggle label="市场调研 AI" checked={form.aiAssistantMarketEnabled} onChange={(value) => update("aiAssistantMarketEnabled", value)} />
          <Toggle label="设计 AI" checked={form.aiAssistantDesignEnabled} onChange={(value) => update("aiAssistantDesignEnabled", value)} />
          <Toggle label="社媒运营 AI" checked={form.aiAssistantSocialEnabled} onChange={(value) => update("aiAssistantSocialEnabled", value)} />
        </div>
        <label className="mt-4 grid gap-2"><span className="text-sm font-black">AI 测试白名单邮箱</span><textarea rows={4} value={aiTesterEmails} onChange={(event) => setAiTesterEmails(event.target.value)} placeholder="每行填写一个邮箱" className="rounded-xl border border-[#E3D8C8] bg-[#FFFDF8] p-4 text-sm outline-none focus:border-[#6F8F4E]" /></label>
      </Section>

      <Section id="payment" title="支付与会员配置" description="V1 保留支付和套餐扩展结构。未正式开通真实支付前，请保持测试模式并关闭支付总开关。">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Toggle label="支付功能总开关" checked={form.paymentEnabled} onChange={(value) => update("paymentEnabled", value)} />
          <Toggle label="微信支付" checked={form.paymentWechatEnabled} onChange={(value) => update("paymentWechatEnabled", value)} />
          <Toggle label="支付宝支付" checked={form.paymentAlipayEnabled} onChange={(value) => update("paymentAlipayEnabled", value)} />
          <Toggle label="支付测试模式" checked={form.paymentTestMode} onChange={(value) => update("paymentTestMode", value)} />
          <Field label="商户号" value={form.paymentMerchantId} onChange={(value) => update("paymentMerchantId", value)} />
          <Field label="应用 ID" value={form.paymentAppId} onChange={(value) => update("paymentAppId", value)} />
          <Field label="支付 API 密钥" type="password" value={form.paymentApiKey} onChange={(value) => update("paymentApiKey", value)} placeholder={secretConfigured.paymentApiKey ? "已配置；留空则不修改" : "填写完整密钥"} />
          <Field label="支付回调地址" value={form.paymentNotifyUrl} onChange={(value) => update("paymentNotifyUrl", value)} />
          <Field label="证书路径" value={form.paymentCertPath} onChange={(value) => update("paymentCertPath", value)} />
        </div>
      </Section>

      <Section id="storage" title="上传、存储与其他接口" description="头像和用户上传默认可继续使用本地存储。云存储、短信和统计接口未启用时不会影响 V1 核心主页功能。">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Toggle label="存储服务总开关" checked={form.storageEnabled} onChange={(value) => update("storageEnabled", value)} />
          <SelectField label="存储方式" value={form.storageProvider} onChange={(value) => update("storageProvider", value)} options={[{ value: "local", label: "服务器本地存储" }, { value: "aliyun-oss", label: "阿里云 OSS" }, { value: "tencent-cos", label: "腾讯云 COS" }]} />
          <Field label="上传目录前缀" value={form.storageUploadPrefix} onChange={(value) => update("storageUploadPrefix", value)} />
          <Field label="存储服务地址" value={form.storageEndpoint} onChange={(value) => update("storageEndpoint", value)} />
          <Field label="存储桶名称" value={form.storageBucket} onChange={(value) => update("storageBucket", value)} />
          <Field label="存储地域" value={form.storageRegion} onChange={(value) => update("storageRegion", value)} />
          <Toggle label="短信服务总开关" checked={form.smsEnabled} onChange={(value) => update("smsEnabled", value)} />
          <Field label="短信服务商" value={form.smsProvider} onChange={(value) => update("smsProvider", value)} />
          <Field label="短信签名" value={form.smsSignName} onChange={(value) => update("smsSignName", value)} />
        </div>
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E8DCCB] bg-white/95 p-3 shadow-[0_-12px_30px_rgba(86,68,46,0.08)] backdrop-blur lg:left-[250px]">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-2 sm:px-5">
          <p className="hidden text-sm font-bold text-[#7A6D5E] sm:block">保存后立即生效，密码留空不会清除原配置。</p>
          <button type="submit" disabled={saving} className="ml-auto min-h-11 rounded-xl bg-[#6F8F4E] px-7 text-sm font-black text-white disabled:opacity-60">{saving ? "正在保存…" : "保存全部配置"}</button>
        </div>
      </div>
    </form>
  );
}
