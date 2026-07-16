"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  MessageSquare,
  Plus,
  Save,
  Settings2,
  Shield,
  Trash2,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import type {
  AiReceptionQuickAction,
  AiReceptionQuickActionType,
  CustomerAiReceptionConfig,
} from "@/lib/ai/reception-config";

type ReceptionConfigClientProps = {
  initialConfig: CustomerAiReceptionConfig;
  profileUsername: string | null;
  productCount: number;
};

const TONE_OPTIONS = [
  { value: "friendly", label: "友好亲切" },
  { value: "professional", label: "专业正式" },
  { value: "concise", label: "简洁高效" },
] as const;

const ACTION_TYPE_OPTIONS: Array<{
  value: AiReceptionQuickActionType;
  label: string;
  placeholder: string;
}> = [
  { value: "auto_reply", label: "预设自动回复", placeholder: "访客点击后直接看到的回复内容" },
  { value: "send_message", label: "向 AI 发送预设问题", placeholder: "例如：请介绍你们的价格方案" },
  { value: "open_url", label: "打开安全链接", placeholder: "https://example.com" },
  { value: "copy_text", label: "复制指定内容", placeholder: "例如：微信号、优惠码或地址" },
  { value: "call_phone", label: "拨打电话", placeholder: "例如：13800138000" },
];

function actionPlaceholder(type: AiReceptionQuickActionType) {
  return ACTION_TYPE_OPTIONS.find((item) => item.value === type)?.placeholder || "填写按钮执行内容";
}

export default function ReceptionConfigClient({
  initialConfig,
  profileUsername,
  productCount,
}: ReceptionConfigClientProps) {
  const [config, setConfig] = useState<CustomerAiReceptionConfig>(initialConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof CustomerAiReceptionConfig>(
    field: K,
    value: CustomerAiReceptionConfig[K],
  ) {
    setConfig((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }

  function addQuickAction() {
    if (config.quickActions.length >= 6) {
      setError("最多配置 6 个快捷按钮。");
      return;
    }
    const next: AiReceptionQuickAction = {
      id: crypto.randomUUID(),
      label: "新按钮",
      type: "auto_reply",
      value: "",
      enabled: true,
      position: config.quickActions.length,
    };
    updateField("quickActions", [...config.quickActions, next]);
    setError(null);
  }

  function updateQuickAction(id: string, patch: Partial<AiReceptionQuickAction>) {
    updateField(
      "quickActions",
      config.quickActions.map((action) => action.id === id ? { ...action, ...patch } : action),
    );
  }

  function removeQuickAction(id: string) {
    updateField(
      "quickActions",
      config.quickActions
        .filter((action) => action.id !== id)
        .map((action, position) => ({ ...action, position })),
    );
  }

  function moveQuickAction(id: string, direction: "up" | "down") {
    const currentIndex = config.quickActions.findIndex((action) => action.id === id);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= config.quickActions.length) return;
    const next = [...config.quickActions];
    const current = next[currentIndex];
    const target = next[targetIndex];
    if (!current || !target) return;
    next[currentIndex] = target;
    next[targetIndex] = current;
    updateField("quickActions", next.map((action, position) => ({ ...action, position })));
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch("/api/dashboard/ai-service-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const result = await response.json() as {
        success?: boolean;
        config?: CustomerAiReceptionConfig;
        error?: string;
      };

      if (!response.ok || !result.success || !result.config) {
        setError(result.error || "保存失败，请检查配置后重试。");
        return;
      }

      setConfig(result.config);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("网络错误，请检查连接后重试。");
    } finally {
      setIsSaving(false);
    }
  }

  const publicUrl = profileUsername ? `/${profileUsername}` : null;

  return (
    <div className="grid gap-4">
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
                  ? "访客可以在你的公开名片中使用 Link168 AI 接待。"
                  : "开启后，已放置 AI 接待组件的公开名片才会显示对话窗口。"}
              </p>
            </div>
          </div>
          <Toggle checked={config.enabled} onChange={(value) => updateField("enabled", value)} />
        </div>

        {publicUrl && config.enabled ? (
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
        ) : null}
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-[#FFE6E2] bg-[#FFF5F3] p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#B42318]" />
          <p className="flex-1 text-sm text-[#7A6D5E]">{error}</p>
        </div>
      ) : null}
      {saved ? (
        <div className="flex items-start gap-3 rounded-2xl border border-[#DDE8CD] bg-[#F7F9F2] p-4">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#6F8F4E]" />
          <p className="text-sm font-bold text-[#3F5F31]">配置已保存</p>
        </div>
      ) : null}

      <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <Settings2 className="size-4 text-[#3F5F31]" />
          <h2 className="text-sm font-black text-[#3F5F31]">助手形象</h2>
        </div>
        <div className="mt-4 grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-xs font-black text-[#3F5F31]">AI 助手名称</span>
            <input
              value={config.assistantName}
              onChange={(event) => updateField("assistantName", event.target.value)}
              placeholder="例如：小助手、经营顾问"
              className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] px-4 py-2 text-sm font-bold outline-none focus:border-[#6F8F4E] focus:bg-white"
              maxLength={30}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-black text-[#3F5F31]">欢迎语</span>
            <textarea
              value={config.welcomeMessage}
              onChange={(event) => updateField("welcomeMessage", event.target.value)}
              placeholder="访客打开对话窗口时看到的第一句话"
              rows={2}
              className="rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] px-4 py-3 text-sm outline-none focus:border-[#6F8F4E] focus:bg-white"
              maxLength={200}
            />
            <span className="text-right text-[10px] text-[#7A6D5E]">{config.welcomeMessage.length} / 200</span>
          </label>
          <div>
            <p className="mb-1.5 text-xs font-black text-[#3F5F31]">语气风格</p>
            <div className="grid grid-cols-3 gap-2">
              {TONE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateField("tone", option.value)}
                  className={`rounded-2xl border p-3 text-xs font-black transition ${
                    config.tone === option.value
                      ? "border-[#6F8F4E] bg-[#DDE8CD] text-[#3F5F31]"
                      : "border-[#E8DCCB] bg-white text-[#7A6D5E] hover:bg-[#F7F1E7]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-[#3F5F31]" />
          <h2 className="text-sm font-black text-[#3F5F31]">经营能力</h2>
        </div>
        <div className="mt-4 grid gap-3">
          <ToggleRow
            icon={Bot}
            label="产品推荐"
            desc="允许 AI 引用你已授权且上架的产品和服务"
            checked={config.allowProductRecommendation}
            onChange={(value) => updateField("allowProductRecommendation", value)}
            badge={productCount > 0 ? `${productCount} 个产品` : "暂无产品"}
          />
          <ToggleRow
            icon={UserPlus}
            label="收集客户线索"
            desc="访客主动提交联系方式时创建客户线索"
            checked={config.collectLead}
            onChange={(value) => updateField("collectLead", value)}
          />
          <ToggleRow
            icon={Shield}
            label="允许举报"
            desc="在公开对话窗口展示平台举报入口"
            checked={config.allowReport}
            onChange={(value) => updateField("allowReport", value)}
          />
        </div>
      </section>

      <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-[#3F5F31]">快捷按钮与预设自动回复</h2>
            <p className="mt-1 text-xs leading-5 text-[#7A6D5E]">
              由你决定按钮名称、动作和顺序。预设自动回复不会调用 AI，也不会消耗额度。
            </p>
          </div>
          <button
            type="button"
            onClick={addQuickAction}
            disabled={config.quickActions.length >= 6}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#2B241E] px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="size-4" />
            添加按钮 {config.quickActions.length}/6
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          {config.quickActions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E8DCCB] bg-[#FFFDF8] px-4 py-8 text-center text-sm text-[#7A6D5E]">
              暂无快捷按钮。访客仍可直接输入问题与 AI 对话。
            </div>
          ) : null}
          {config.quickActions.map((action, index) => (
            <div key={action.id} className="rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-full bg-[#DDE8CD] text-xs font-black text-[#3F5F31]">
                    {index + 1}
                  </span>
                  <span className="text-xs font-black text-[#2B241E]">快捷按钮</span>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moveQuickAction(action.id, "up")} disabled={index === 0} aria-label="上移" className="grid size-8 place-items-center rounded-lg border border-[#E8DCCB] disabled:opacity-30"><ChevronUp className="size-4" /></button>
                  <button type="button" onClick={() => moveQuickAction(action.id, "down")} disabled={index === config.quickActions.length - 1} aria-label="下移" className="grid size-8 place-items-center rounded-lg border border-[#E8DCCB] disabled:opacity-30"><ChevronDown className="size-4" /></button>
                  <button type="button" onClick={() => removeQuickAction(action.id)} aria-label="删除" className="grid size-8 place-items-center rounded-lg border border-[#F0C7C2] text-[#B42318]"><Trash2 className="size-4" /></button>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-xs font-black text-[#3F5F31]">按钮名称</span>
                  <input
                    value={action.label}
                    onChange={(event) => updateQuickAction(action.id, { label: event.target.value })}
                    maxLength={20}
                    className="min-h-10 rounded-xl border border-[#E8DCCB] bg-white px-3 text-sm outline-none focus:border-[#6F8F4E]"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-black text-[#3F5F31]">点击动作</span>
                  <select
                    value={action.type}
                    onChange={(event) => updateQuickAction(action.id, {
                      type: event.target.value as AiReceptionQuickActionType,
                      value: "",
                    })}
                    className="min-h-10 rounded-xl border border-[#E8DCCB] bg-white px-3 text-sm outline-none focus:border-[#6F8F4E]"
                  >
                    {ACTION_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="grid gap-1.5 md:col-span-2">
                  <span className="text-xs font-black text-[#3F5F31]">动作内容</span>
                  <textarea
                    value={action.value}
                    onChange={(event) => updateQuickAction(action.id, { value: event.target.value })}
                    placeholder={actionPlaceholder(action.type)}
                    maxLength={1000}
                    rows={action.type === "auto_reply" || action.type === "send_message" ? 3 : 2}
                    className="rounded-xl border border-[#E8DCCB] bg-white px-3 py-2 text-sm outline-none focus:border-[#6F8F4E]"
                  />
                </label>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                <span className="text-xs text-[#7A6D5E]">关闭后保存但不在公开页展示</span>
                <Toggle checked={action.enabled} onChange={(value) => updateQuickAction(action.id, { enabled: value })} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-[#3F5F31]" />
          <h2 className="text-sm font-black text-[#3F5F31]">隐私提示文案</h2>
        </div>
        <p className="mt-1 text-xs text-[#7A6D5E]">访客与 AI 对话时显示，不填则使用 Link168 默认文案。</p>
        <textarea
          value={config.privacyNoticeText || ""}
          onChange={(event) => updateField("privacyNoticeText", event.target.value || null)}
          placeholder="本对话由 AI 自动回复，请勿透露敏感信息。"
          rows={2}
          className="mt-3 w-full rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] px-4 py-3 text-sm outline-none focus:border-[#6F8F4E] focus:bg-white"
          maxLength={300}
        />
      </section>

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

      <div className="rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8] p-5">
        <div className="flex items-start gap-3">
          <UserPlus className="mt-0.5 size-4 shrink-0 text-[#8C612E]" />
          <div>
            <p className="text-sm font-black text-[#8C612E]">AI 转客户线索</p>
            <p className="mt-1 text-xs leading-5 text-[#7A6D5E]">
              只有访客主动留下的联系方式才会保存。可在
              <Link href="/workbench/leads" className="font-bold text-[#6F8F4E] hover:underline"> 客户线索</Link>
              中查看。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="relative inline-flex shrink-0 cursor-pointer items-center">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
      <span className="h-6 w-11 rounded-full bg-[#E8DCCB] transition peer-checked:bg-[#6F8F4E]" />
      <span className="absolute left-1 top-1 size-4 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
    </label>
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
  onChange: (value: boolean) => void;
  badge?: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
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
          {badge ? <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-[#7A6D5E]">{badge}</span> : null}
        </div>
        <p className="text-xs text-[#7A6D5E]">{desc}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}
