"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Copy, Loader2, Save, ShieldAlert } from "lucide-react";
import PaymentDiagnosticsPanel from "@/components/admin/PaymentDiagnosticsPanel";
import AiCreditAuditPanel from "@/components/admin/AiCreditAuditPanel";

type PaymentConfig = {
  paymentEnabled: boolean;
  paymentWechatEnabled: boolean;
  paymentAlipayEnabled: boolean;
  paymentTestMode: boolean;
  paymentAlipayAppId: string;
  paymentAlipayAppPrivateKey: string;
  paymentAlipayPublicKey: string;
  paymentAlipaySellerId: string;
  paymentAlipayNotifyUrl: string;
};

type ApiResult = {
  success?: boolean;
  data?: PaymentConfig | { config?: PaymentConfig } | null;
  message?: string;
  error?: string | { message?: string } | null;
};

const initial: PaymentConfig = {
  paymentEnabled: false,
  paymentWechatEnabled: false,
  paymentAlipayEnabled: false,
  paymentTestMode: true,
  paymentAlipayAppId: "",
  paymentAlipayAppPrivateKey: "",
  paymentAlipayPublicKey: "",
  paymentAlipaySellerId: "",
  paymentAlipayNotifyUrl: "https://link168.me/api/payments/alipay/notify",
};

function errorText(value: ApiResult["error"]) {
  if (typeof value === "string") return value;
  return value?.message || "操作失败，请稍后再试。";
}

function Field({ label, value, onChange, placeholder, secret, hint }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  secret?: boolean;
  hint?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-[#2B241E]">{label}</span>
      {secret ? (
        <textarea rows={5} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full resize-y rounded-xl border border-[#E3D8C8] bg-[#FFFDF8] px-3.5 py-3 font-mono text-xs outline-none focus:border-[#1677FF]" />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-h-11 w-full rounded-xl border border-[#E3D8C8] bg-[#FFFDF8] px-3.5 text-sm outline-none focus:border-[#1677FF]" />
      )}
      {hint ? <span className="text-xs leading-5 text-[#8B7B68]">{hint}</span> : null}
    </label>
  );
}

function Toggle({ label, checked, onChange, hint }: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] p-4">
      <span><span className="block text-sm font-black">{label}</span>{hint ? <span className="mt-1 block text-xs leading-5 text-[#8B7B68]">{hint}</span> : null}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 size-5 accent-[#1677FF]" />
    </label>
  );
}

export default function AdminPaymentSettingsClient() {
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [privateKeyConfigured, setPrivateKeyConfigured] = useState(false);
  const [publicKeyConfigured, setPublicKeyConfigured] = useState(false);

  const update = <K extends keyof PaymentConfig>(key: K, value: PaymentConfig[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/jeepwork/settings/api", { cache: "no-store" });
      const result = await response.json() as ApiResult;
      if (!response.ok || !result.success || !result.data) throw new Error(errorText(result.error));
      const nested = result.data as { config?: PaymentConfig };
      const loaded = { ...initial, ...(nested.config || result.data as PaymentConfig) };
      setPrivateKeyConfigured(Boolean(loaded.paymentAlipayAppPrivateKey));
      setPublicKeyConfigured(Boolean(loaded.paymentAlipayPublicKey));
      loaded.paymentAlipayAppPrivateKey = "";
      loaded.paymentAlipayPublicKey = "";
      loaded.paymentWechatEnabled = false;
      setForm(loaded);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "支付宝配置加载失败。");
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
      const response = await fetch("/api/jeepwork/settings/api", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentEnabled: form.paymentEnabled,
          paymentWechatEnabled: false,
          paymentAlipayEnabled: form.paymentAlipayEnabled,
          paymentTestMode: form.paymentTestMode,
          paymentAlipayAppId: form.paymentAlipayAppId.trim(),
          paymentAlipayAppPrivateKey: form.paymentAlipayAppPrivateKey.trim(),
          paymentAlipayPublicKey: form.paymentAlipayPublicKey.trim(),
          paymentAlipaySellerId: form.paymentAlipaySellerId.trim(),
          paymentAlipayNotifyUrl: form.paymentAlipayNotifyUrl.trim(),
        }),
      });
      const result = await response.json() as ApiResult;
      if (!response.ok || !result.success) throw new Error(errorText(result.error));
      setMessage("支付宝配置已保存。密钥留空不会清除原配置。");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "支付宝配置保存失败。");
    } finally {
      setSaving(false);
    }
  }

  async function copyNotifyUrl() {
    await navigator.clipboard.writeText(form.paymentAlipayNotifyUrl);
    setMessage("支付宝异步通知地址已复制。");
  }

  if (loading) return <div className="grid min-h-64 place-items-center"><Loader2 className="size-7 animate-spin text-[#1677FF]" /></div>;

  const complete = Boolean(
    form.paymentAlipayAppId.trim()
      && (privateKeyConfigured || form.paymentAlipayAppPrivateKey.trim())
      && (publicKeyConfigured || form.paymentAlipayPublicKey.trim())
      && form.paymentAlipayNotifyUrl.trim(),
  );
  const ready = form.paymentEnabled && form.paymentAlipayEnabled && complete;

  return (
    <form onSubmit={save} className="grid gap-6 pb-24">
      {message ? <p className="rounded-2xl bg-[#EEF4E7] px-4 py-3 text-sm font-bold text-[#355126]">{message}</p> : null}
      {error ? <p className="rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">{error}</p> : null}

      <section className="rounded-[24px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-black text-[#1677FF]">支付宝收款状态</p><h2 className="mt-1 text-2xl font-black">{ready ? "配置完整，等待真实验收" : "配置尚未完整"}</h2><p className="mt-2 text-sm leading-6 text-[#7A6D5E]">当前网站只向用户展示支付宝；微信支付统一标注为后续开放。配置完整不等于真实支付已验收。</p></div>
          <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black ${ready ? "bg-[#EEF4E7] text-[#355126]" : "bg-[#FFF7ED] text-[#9A4E12]"}`}>
            {ready ? <CheckCircle2 className="size-4" /> : <ShieldAlert className="size-4" />}{ready ? "配置完整" : "待完善"}
          </span>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-black">开关与运行模式</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Toggle label="支付功能总开关" checked={form.paymentEnabled} onChange={(value) => update("paymentEnabled", value)} hint="关闭后所有真实订单都不能创建。" />
          <Toggle label="支付宝支付" checked={form.paymentAlipayEnabled} onChange={(value) => update("paymentAlipayEnabled", value)} hint="当前唯一正式收款方式。" />
          <Toggle label="支付测试模式" checked={form.paymentTestMode} onChange={(value) => update("paymentTestMode", value)} hint="测试模式不会跳转真实支付宝网关；正式收款前必须关闭。" />
        </div>
      </section>

      <section className="rounded-[24px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-black">支付宝开放平台配置</h2>
        <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">请填写支付宝开放平台应用中的真实参数。应用私钥和支付宝公钥会加密保存，页面不会回显完整值。</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Field label="支付宝 App ID" value={form.paymentAlipayAppId} onChange={(value) => update("paymentAlipayAppId", value)} placeholder="例如 202100XXXXXXXXXX" />
          <Field label="支付宝 Seller ID（建议填写）" value={form.paymentAlipaySellerId} onChange={(value) => update("paymentAlipaySellerId", value)} placeholder="支付宝账号对应的 seller_id" />
          <Field label="应用私钥" secret value={form.paymentAlipayAppPrivateKey} onChange={(value) => update("paymentAlipayAppPrivateKey", value)} placeholder={privateKeyConfigured ? "已配置；留空不修改" : "粘贴应用私钥，不是支付宝公钥"} hint={privateKeyConfigured ? "当前应用私钥已保存。重新填写才会覆盖。" : "支持带 PEM 头尾或纯密钥正文。"} />
          <Field label="支付宝公钥" secret value={form.paymentAlipayPublicKey} onChange={(value) => update("paymentAlipayPublicKey", value)} placeholder={publicKeyConfigured ? "已配置；留空不修改" : "粘贴支付宝公钥"} hint={publicKeyConfigured ? "当前支付宝公钥已保存。重新填写才会覆盖。" : "用于验证支付宝异步通知和主动查单响应签名。"} />
          <div className="lg:col-span-2">
            <Field label="支付宝异步通知地址" value={form.paymentAlipayNotifyUrl} onChange={(value) => update("paymentAlipayNotifyUrl", value)} placeholder="https://link168.me/api/payments/alipay/notify" hint="必须为公网 HTTPS 地址；正式模式下不能为空，也不能使用内网、localhost 或元数据地址。" />
            <button type="button" onClick={() => void copyNotifyUrl()} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#D9E4F4] bg-[#F3F8FF] px-4 py-2 text-sm font-black text-[#1677FF]"><Copy className="size-4" />复制通知地址</button>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#F3D3A7] bg-[#FFF9F0] p-5 text-sm leading-7 text-[#805126]">
        <p className="font-black">正式收款前检查</p>
        <p className="mt-2">1. 测试密钥格式；2. 支付宝应用完成审核和电脑网站支付签约；3. 异步通知地址可被公网访问；4. 使用 0.01 元内部套餐真实付款；5. 验证回调、主动查单、补单、会员开通和 AI Credits 发放；6. 全部通过后再关闭测试模式并开放正式收款。</p>
      </section>

      <PaymentDiagnosticsPanel />
      <AiCreditAuditPanel />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E8DCCB] bg-white/95 p-3 shadow-[0_-12px_30px_rgba(86,68,46,0.08)] backdrop-blur lg:left-[250px]">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-2 sm:px-5">
          <p className="hidden text-sm font-bold text-[#7A6D5E] sm:block">保存后立即供订单、回调和主动查单接口读取。</p>
          <button type="submit" disabled={saving} className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1677FF] px-7 text-sm font-black text-white disabled:opacity-60">{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{saving ? "正在保存" : "保存支付宝配置"}</button>
        </div>
      </div>
    </form>
  );
}
