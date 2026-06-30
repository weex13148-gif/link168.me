"use client";

import { useState, useEffect, useCallback } from "react";
import WorkbenchShell from "@/components/workbench/WorkbenchShell";
import { Bot, MessageCircle, Sparkles, Users, Loader, CheckCircle, XCircle } from "lucide-react";

type AiConfig = {
  enabled: boolean;
  assistant_name: string;
  welcome_message: string;
  tone: string;
  allow_product_recommendation: boolean;
  collect_lead: boolean;
  provider_mode: string;
};

type ConversationSummary = {
  total_today: number;
  total_month: number;
  satisfaction_rate: number;
  leads_collected: number;
};

export default function WorkbenchAIServicePage() {
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [editForm, setEditForm] = useState<AiConfig | null>(null);
  const [stats] = useState<ConversationSummary>({
    total_today: 0,
    total_month: 0,
    satisfaction_rate: 0,
    leads_collected: 0,
  });

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/workbench/ai-config");
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
        setEditForm(data.config);
      }
    } catch {
      // silently fail in dev mode
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/workbench/ai-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setEditForm(data.config);
        setSaveMsg({ ok: true, text: "保存成功！" });
      } else {
        setSaveMsg({ ok: false, text: data.error || "保存失败。" });
      }
    } catch {
      setSaveMsg({ ok: false, text: "网络错误，请稍后重试。" });
    } finally {
      setSaving(false);
    }
  }

  const toneOptions = [
    { value: "friendly", label: "友好" },
    { value: "professional", label: "专业" },
    { value: "casual", label: "轻松" },
    { value: "formal", label: "正式" },
  ];

  const providerOptions = [
    { value: "mock", label: "演示模式（无需 API Key）" },
    { value: "openai", label: "OpenAI" },
    { value: "deepseek", label: "DeepSeek" },
    { value: "qwen", label: "通义千问" },
  ];

  if (loading) {
    return (
      <WorkbenchShell eyebrow="AI Service" title="AI 客服" subtitle="配置客服欢迎语、接入知识库、查看对话记录，并持续优化回答质量。">
        <div className="flex items-center justify-center py-20">
          <Loader className="size-6 animate-spin text-[#6F8F4E]" />
        </div>
      </WorkbenchShell>
    );
  }

  return (
    <WorkbenchShell eyebrow="AI Service" title="AI 客服" subtitle="配置客服欢迎语、接入知识库、查看对话记录，并持续优化回答质量。">
      {/* 统计卡片 */}
      <section className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "今日对话", value: stats.total_today, icon: MessageCircle, tone: "bg-[#DDE8CD] text-[#3F5F31]" },
          { label: "本月对话", value: stats.total_month, icon: Bot, tone: "bg-[#EAF3FF] text-[#2563EB]" },
          { label: "满意线索", value: stats.leads_collected, icon: Users, tone: "bg-[#FFE6E2] text-[#B42318]" },
          { label: "AI 额度", value: "—", icon: Sparkles, tone: "bg-[#F6E7C8] text-[#8C612E]" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#7A6D5E]">{item.label}</p>
                <span className={`grid size-8 place-items-center rounded-xl ${item.tone}`}>
                  <Icon aria-hidden className="size-4" />
                </span>
              </div>
              <p className="mt-2 text-3xl font-black tracking-tight text-[#2B241E]">{item.value}</p>
            </div>
          );
        })}
      </section>

      {/* 配置表单 */}
      <section className="mt-6 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
        <form onSubmit={handleSave} className="grid gap-5">
          {/* 开关 */}
          <div className="flex items-center justify-between rounded-2xl bg-[#F7F1E7] px-5 py-4">
            <div>
              <p className="font-black text-[#2B241E]">AI 客服开关</p>
              <p className="mt-1 text-xs text-[#7A6D5E]">开启后，公开主页会显示「咨询 AI」入口。</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={editForm?.enabled ?? false}
              onClick={() => editForm && setEditForm({ ...editForm, enabled: !editForm.enabled })}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none ${
                editForm?.enabled ? "bg-[#6F8F4E]" : "bg-[#D1CBBF]"
              }`}
            >
              <span
                className={`inline-block size-5 transform rounded-full bg-white shadow-sm transition-transform ${
                  editForm?.enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* 助理名称 */}
          <label className="grid gap-1.5 text-sm">
            <span className="font-black text-[#2B241E]">AI 助理名称</span>
            <input
              type="text"
              value={editForm?.assistant_name ?? ""}
              onChange={(e) => editForm && setEditForm({ ...editForm, assistant_name: e.target.value })}
              maxLength={50}
              className="rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none"
              placeholder="例如：AI 助理、智能客服"
            />
          </label>

          {/* 欢迎语 */}
          <label className="grid gap-1.5 text-sm">
            <span className="font-black text-[#2B241E]">默认欢迎语</span>
            <textarea
              value={editForm?.welcome_message ?? ""}
              onChange={(e) => editForm && setEditForm({ ...editForm, welcome_message: e.target.value })}
              maxLength={500}
              rows={4}
              className="resize-none rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none"
              placeholder="访客打开 AI 对话时看到的第一句话"
            />
          </label>

          {/* 语气 */}
          <label className="grid gap-1.5 text-sm">
            <span className="font-black text-[#2B241E]">对话语气</span>
            <div className="flex flex-wrap gap-2">
              {toneOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => editForm && setEditForm({ ...editForm, tone: opt.value })}
                  className={`rounded-full px-4 py-2 text-xs font-black transition ${
                    editForm?.tone === opt.value
                      ? "bg-[#6F8F4E] text-white"
                      : "bg-[#F7F1E7] text-[#3F5F31] ring-1 ring-[#E8DCCB]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </label>

          {/* AI Provider */}
          <label className="grid gap-1.5 text-sm">
            <span className="font-black text-[#2B241E]">AI 提供商</span>
            <div className="flex flex-wrap gap-2">
              {providerOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => editForm && setEditForm({ ...editForm, provider_mode: opt.value })}
                  className={`rounded-full px-4 py-2 text-xs font-black transition ${
                    editForm?.provider_mode === opt.value
                      ? "bg-[#6F8F4E] text-white"
                      : "bg-[#F7F1E7] text-[#3F5F31] ring-1 ring-[#E8DCCB]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#7A6D5E]">正式 AI 配置请在超级管理员配置中心填写 API Key。</p>
          </label>

          {/* 开关选项 */}
          <div className="grid gap-2 text-sm">
            {[
              { key: "allow_product_recommendation", label: "允许 AI 推荐产品", desc: "根据对话内容推荐已添加的产品" },
              { key: "collect_lead", label: "允许收集线索", desc: "AI 引导访客留下联系方式" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between rounded-2xl bg-[#F7F1E7] px-4 py-3">
                <div>
                  <p className="font-bold text-[#2B241E]">{item.label}</p>
                  <p className="text-xs text-[#7A6D5E]">{item.desc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={editForm ? Boolean(editForm[item.key as keyof AiConfig]) : false}
                  onClick={() =>
                    editForm &&
                    setEditForm({
                      ...editForm,
                      [item.key]: !editForm[item.key as keyof AiConfig],
                    })
                  }
                  className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none ${
                    editForm && editForm[item.key as keyof AiConfig] ? "bg-[#6F8F4E]" : "bg-[#D1CBBF]"
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      editForm && editForm[item.key as keyof AiConfig] ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          {/* 保存按钮 */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#6F8F4E] px-6 text-sm font-black text-white hover:bg-[#5E7F3F] disabled:opacity-50"
            >
              {saving ? <><Loader className="size-4 animate-spin" />保存中...</> : "保存配置"}
            </button>
            {saveMsg && (
              <span className={`inline-flex items-center gap-1 text-sm font-bold ${saveMsg.ok ? "text-[#6F8F4E]" : "text-[#B42318]"}`}>
                {saveMsg.ok ? <CheckCircle className="size-4" /> : <XCircle className="size-4" />}
                {saveMsg.text}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* 状态提示 */}
      <section className="mt-6 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <Sparkles aria-hidden className="size-4 text-[#6F8F4E]" />
          <p className="text-sm font-black text-[#3F5F31]">配置状态</p>
        </div>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {[
            { label: "AI 服务", value: config?.enabled ? "已开启" : "未开启" },
            { label: "当前模式", value: config?.provider_mode === "mock" ? "演示模式" : (providerOptions.find(p => p.value === config?.provider_mode)?.label ?? config?.provider_mode) },
            { label: "助理名称", value: config?.assistant_name ?? "—" },
            { label: "对话语气", value: toneOptions.find(t => t.value === config?.tone)?.label ?? config?.tone ?? "—" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-2xl bg-[#F7F1E7] px-4 py-3">
              <span className="font-bold text-[#2B241E]">{item.label}</span>
              <span className="text-xs font-black text-[#3F5F31]">{item.value}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-[#7A6D5E]">
          真实 AI 对话接入需要在超级管理员配置中心填写 API Key。演示模式下 AI 回复为模拟内容。
        </p>
      </section>
    </WorkbenchShell>
  );
}
