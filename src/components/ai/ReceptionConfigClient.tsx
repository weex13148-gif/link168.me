"use client";

import { useState } from "react";
import {
  Bot,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Settings2,
  Shield,
  UserPlus,
} from "lucide-react";
import Link from "next/link";

type AiServiceConfig = {
  id?: string;
  enabled: boolean;
  assistantName: string;
  welcomeMessage: string;
  tone: string;
  allowProductRecommendation: boolean;
  collectLead: boolean;
  allowReport: boolean;
  allowTransferToHuman: boolean;
  privacyNoticeText: string | null;
  providerMode: string;
};

type ReceptionConfigClientProps = {
  initialConfig: AiServiceConfig | null;
  profileUsername: string | null;
  productCount: number;
};

const TONE_OPTIONS = [
  { value: "friendly", label: "友好亲切" },
  { value: "professional", label: "专业正式" },
  { value: "concise", label: "简洁高效" },
];

export default function ReceptionConfigClient({
  initialConfig,
  profileUsername,
  productCount,
}: ReceptionConfigClientProps) {
  const [config, setConfig] = useState<AiServiceConfig>(
    initialConfig || {
      enabled: false,
      assistantName: "AI 助理",
      welcomeMessage: "你好！我是 AI 助理，有什么可以帮你？",
      tone: "friendly",
      allowProductRecommendation: true,
      collectLead: true,
      allowReport: true,
      allowTransferToHuman: true,
      privacyNoticeText: null,
      providerMode: "mock",
    },
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof AiServiceConfig>(field: K, value: AiServiceConfig[K]) {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/dashboard/ai-service-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "保存失败，请稍后重试。");
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("网络错误，请检查连接后重试。");
    } finally {
      setIsSaving(false);
    }
  }

  const publicUrl = profileUsername ? `/${profileUsername}` : null;

  return (
    <div className="grid gap-4">
      {/* 状态卡 */}
      <div className={`rounded-[28px] border p-5 shadow-sm ${
        config.enabled
          ? "border-[#DDE8CD] bg-gradient-to-br from-[#F7F9F2] to-[#E8F0DC]"
          : "border-[#E8DCCB] bg-white"
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className={`grid size-12 place-items-center rounded-2xl ${
              config.enabled ? "bg-[#6F8F4E] text-white" : "bg-[#F7F1E7] text-[#7A6D5E]"
            }`}>
              <Bot className="size-6" />
            </span>
            <div>
              <p className="text-sm font-black text-[#3F5F31]">AI 接待状态</p>
              <p className="mt-1 text-lg font-black text-[#2B241E]">
                {config.enabled ? "已开启" : "未开启"}
              </p>
              <p className="mt-1 text-xs text-[#7A6D5E]">
                {config.enabled
                  ? "访客访问你的名片时，AI 客服将自动接待咨询。"
                  : "开启后，访客访问你的名片时可以与 AI 客服对话。"}
              </p>
            </div>
          </div>
          <label className="relative inline-flex shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => updateField("enabled", e.target.checked)}
              className="peer sr-only"
            />
            <span className="h-7 w-12 rounded-full bg-[#E8DCCB] transition peer-checked:bg-[#6F8F4E] peer-focus:outline-none" />
            <span className="absolute left-1 top-1 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
          </label>
        </div>

        {publicUrl && config.enabled && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/60 px-4 py-2">
            <ExternalLink className="size-4 text-[#6F8F4E]" />
            <Link
              href={publicUrl}
              className="text-xs font-bold text-[#6F8F4E] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              查看公开名片 →
            </Link>
          </div>
        )}
      </div>

      {/* 错误/成功提示 */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-[#FFE6E2] bg-[#FFF5F3] p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#B42318]" />
          <p className="flex-1 text-sm text-[#7A6D5E]">{error}</p>
        </div>
      )}
      {saved && (
        <div className="flex items-start gap-3 rounded-2xl border border-[#DDE8CD] bg-[#F7F9F2] p-4">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#6F8F4E]" />
          <p className="text-sm font-bold text-[#3F5F31]">配置已保存</p>
        </div>
      )}

      {/* 基础配置 */}
      <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <Settings2 className="size-4 text-[#3F5F31]" />
          <p className="text-sm font-black text-[#3F5F31]">基础配置</p>
        </div>

        <div className="mt-4 grid gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-black text-[#3F5F31]">AI 助手名称</label>
            <input
              type="text"
              value={config.assistantName}
              onChange={(e) => updateField("assistantName", e.target.value)}
              placeholder="例如：小助手、AI 顾问"
              className="min-h-10 w-full rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] px-4 py-2 text-sm font-bold text-[#2B241E] outline-none focus:border-[#6F8F4E] focus:bg-white"
              maxLength={30}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black text-[#3F5F31]">欢迎语</label>
            <textarea
              value={config.welcomeMessage}
              onChange={(e) => updateField("welcomeMessage", e.target.value)}
              placeholder="访客打开名片时看到的第一句话"
              rows={2}
              className="w-full rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] px-4 py-3 text-sm text-[#2B241E] outline-none focus:border-[#6F8F4E] focus:bg-white"
              maxLength={200}
            />
            <p className="mt-1 text-right text-[10px] text-[#7A6D5E]">{config.welcomeMessage.length} / 200</p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black text-[#3F5F31]">语气风格</label>
            <div className="grid grid-cols-3 gap-2">
              {TONE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField("tone", opt.value)}
                  className={`rounded-2xl border p-3 text-center text-xs font-black transition ${
                    config.tone === opt.value
                      ? "border-[#6F8F4E] bg-[#DDE8CD] text-[#3F5F31]"
                      : "border-[#E8DCCB] bg-white text-[#7A6D5E] hover:bg-[#F7F1E7]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 功能开关 */}
      <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-[#3F5F31]" />
          <p className="text-sm font-black text-[#3F5F31]">功能配置</p>
        </div>

        <div className="mt-4 grid gap-3">
          <ToggleRow
            icon={Bot}
            label="产品推荐"
            desc="允许 AI 向访客推荐你的产品和服务"
            checked={config.allowProductRecommendation}
            onChange={(v) => updateField("allowProductRecommendation", v)}
            badge={productCount > 0 ? `${productCount} 个产品` : "暂无产品"}
          />
          <ToggleRow
            icon={UserPlus}
            label="收集客户线索"
            desc="AI 引导访客留下联系方式，自动创建客户线索"
            checked={config.collectLead}
            onChange={(v) => updateField("collectLead", v)}
          />
          <ToggleRow
            icon={Shield}
            label="允许举报"
            desc="访客可以对 AI 回复进行举报"
            checked={config.allowReport}
            onChange={(v) => updateField("allowReport", v)}
          />
          <ToggleRow
            icon={MessageSquare}
            label="转人工"
            desc="AI 无法回答时引导访客联系人工"
            checked={config.allowTransferToHuman}
            onChange={(v) => updateField("allowTransferToHuman", v)}
          />
        </div>
      </div>

      {/* 隐私提示 */}
      <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-[#3F5F31]" />
          <p className="text-sm font-black text-[#3F5F31]">隐私提示文案</p>
        </div>
        <p className="mt-1 text-xs text-[#7A6D5E]">
          访客与 AI 对话时显示的隐私提示，不填则使用默认文案。
        </p>
        <textarea
          value={config.privacyNoticeText || ""}
          onChange={(e) => updateField("privacyNoticeText", e.target.value || null)}
          placeholder="默认：本对话由 AI 自动回复，请勿透露敏感信息。"
          rows={2}
          className="mt-3 w-full rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] px-4 py-3 text-sm text-[#2B241E] outline-none focus:border-[#6F8F4E] focus:bg-white"
          maxLength={300}
        />
      </div>

      {/* 保存按钮 */}
      <div className="sticky bottom-4 z-10 lg:bottom-0">
        <div className="flex items-center justify-end gap-3 rounded-[28px] border border-[#E8DCCB] bg-white/95 p-4 shadow-lg backdrop-blur">
          <span className="text-xs text-[#7A6D5E]">修改后请点击保存</span>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#6F8F4E] px-6 text-sm font-black text-white hover:bg-[#5A7A40] disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            保存配置
          </button>
        </div>
      </div>

      {/* AI 转线索说明 */}
      <div className="rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8] p-5">
        <div className="flex items-start gap-3">
          <UserPlus className="mt-0.5 size-4 shrink-0 text-[#8C612E]" />
          <div>
            <p className="text-sm font-black text-[#8C612E]">AI 转客户线索</p>
            <p className="mt-1 text-xs text-[#7A6D5E]">
              开启「收集客户线索」后，当访客在对话中主动留下联系方式时，系统会自动创建客户线索。
              线索来源标记为 AI 对话，可在
              <Link href="/workbench/leads" className="font-bold text-[#6F8F4E] hover:underline"> 客户线索</Link>
              中查看。
            </p>
            <p className="mt-2 text-[10px] text-[#7A6D5E]">
              注意：AI 不会自动猜测访客的电话、微信号或邮箱，只有访客主动填写的信息才会被保存。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  desc,
  checked,
  onChange,
  badge,
}: {
  icon: typeof Bot;
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  badge?: string;
}) {
  return (
    <label className={`flex items-center gap-3 rounded-2xl border p-3 cursor-pointer transition ${
      checked ? "border-[#DDE8CD] bg-[#F7F9F2]" : "border-[#E8DCCB] bg-[#F7F1E7]"
    }`}>
      <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${
        checked ? "bg-[#6F8F4E] text-white" : "bg-white text-[#7A6D5E]"
      }`}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-black text-[#2B241E]">{label}</p>
          {badge ? (
            <span className="rounded-full bg-[#F7F1E7] px-2 py-0.5 text-[10px] font-black text-[#7A6D5E]">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-[#7A6D5E]">{desc}</p>
      </div>
      <label className="relative inline-flex shrink-0 cursor-pointer items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-[#E8DCCB] transition peer-checked:bg-[#6F8F4E]" />
        <span className="absolute left-1 top-1 size-4 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </label>
    </label>
  );
}
