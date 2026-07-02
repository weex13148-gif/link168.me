"use client";

import { useEffect, useMemo, useState } from "react";
import { Crown, LayoutTemplate, Loader2, Palette, Save } from "lucide-react";

const themes = [
  { name: "Link168 草木默认", label: "草木默认", free: true, surface: "#F7F1E7", card: "#FFFDF8", accent: "#6F8F4E" },
  { name: "简约白", label: "简约白", free: true, surface: "#FFFFFF", card: "#F8FAFC", accent: "#2B241E" },
  { name: "商务黑", label: "商务黑", free: false, surface: "#111827", card: "#1F2937", accent: "#F8F1D1" },
  { name: "蓝色科技", label: "蓝色科技", free: false, surface: "#EAF3FF", card: "#FFFFFF", accent: "#2563EB" },
  { name: "橙色活力", label: "橙色活力", free: false, surface: "#FFF3E6", card: "#FFFFFF", accent: "#F97316" },
  { name: "浅绿清新", label: "浅绿清新", free: false, surface: "#DDE8CD", card: "#FFFDF8", accent: "#6F8F4E" },
];

const templates = [
  { value: "business", label: "商务名片", description: "结构清晰，适合顾问、商家和个人服务。" },
  { value: "creator", label: "创作者主页", description: "突出头像、简介和内容平台入口。" },
  { value: "conversion", label: "转化主页", description: "强调核心行动按钮和咨询入口。" },
];

export function AppearancePanel({
  theme,
  template,
  customThemes,
  saving,
  onSave,
  onUpgrade,
}: {
  theme: string;
  template: string;
  customThemes: string[];
  saving: boolean;
  onSave: (theme: string, template: string) => Promise<boolean>;
  onUpgrade: () => void;
}) {
  const [selectedTheme, setSelectedTheme] = useState(theme || "Link168 草木默认");
  const [selectedTemplate, setSelectedTemplate] = useState(template || "business");

  useEffect(() => setSelectedTheme(theme || "Link168 草木默认"), [theme]);
  useEffect(() => setSelectedTemplate(template || "business"), [template]);

  const dirty = useMemo(() => selectedTheme !== theme || selectedTemplate !== template, [selectedTheme, selectedTemplate, theme, template]);

  function canUseTheme(item: (typeof themes)[number]): boolean {
    if (item.free) return true;
    return customThemes.includes(item.label);
  }

  function chooseTheme(item: (typeof themes)[number]) {
    if (!canUseTheme(item)) {
      onUpgrade();
      return;
    }
    setSelectedTheme(item.name);
  }

  return (
    <div className="grid gap-5">
      <header>
        <p className="ui-eyebrow">主题装修</p>
        <h1 className="mt-1 text-2xl ui-title sm:text-3xl">选择真实可用的主页风格</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 ui-muted">免费主题可以直接使用。会员主题会明确标记，不再展示尚未完成的自定义控件。</p>
      </header>

      <section className="ui-surface p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--ui-brand-soft)] text-[var(--ui-brand-hover)]"><Palette className="size-5" /></span>
          <div><h2 className="text-lg font-black">页面主题</h2><p className="mt-1 text-xs ui-muted">点击主题后先在右侧预览，保存后应用到公开主页。</p></div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {themes.map((item) => {
            const locked = !canUseTheme(item);
            const selected = selectedTheme === item.name;
            return (
              <button key={item.name} type="button" onClick={() => chooseTheme(item)} className={`relative overflow-hidden rounded-[18px] border p-3 text-left transition ${selected ? "border-[var(--ui-brand)] ring-2 ring-[color:var(--ui-brand)]/15" : "border-[var(--ui-line)] hover:border-[color:var(--ui-brand)]/35"}`}>
                <div className="h-28 rounded-xl p-3" style={{ background: item.surface }}>
                  <div className="mx-auto grid h-full max-w-[150px] content-start gap-2 rounded-xl p-3 shadow-sm" style={{ background: item.card }}>
                    <span className="mx-auto size-7 rounded-full" style={{ background: item.accent }} />
                    <span className="mx-auto h-2 w-16 rounded-full opacity-70" style={{ background: item.accent }} />
                    <span className="h-5 rounded-lg" style={{ background: item.accent }} />
                    <span className="h-5 rounded-lg opacity-75" style={{ background: item.accent }} />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="font-black">{item.label}</span>
                  {item.free ? <span className="rounded-full bg-[var(--ui-success-soft)] px-2 py-1 text-[10px] font-black text-[var(--ui-success)]">免费</span> : <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ui-accent-soft)] px-2 py-1 text-[10px] font-black text-[#8C612E]"><Crown className="size-3" />会员</span>}
                </div>
                {locked ? <div className="absolute inset-0 grid place-items-center bg-white/62 backdrop-blur-[1px]"><span className="rounded-full bg-[var(--ui-ink)] px-3 py-1.5 text-xs font-black text-white">升级后使用</span></div> : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="ui-surface p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--ui-info-soft)] text-[var(--ui-info)]"><LayoutTemplate className="size-5" /></span>
          <div><h2 className="text-lg font-black">内容布局</h2><p className="mt-1 text-xs ui-muted">布局改变信息顺序，不会删除你的资料和链接。</p></div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {templates.map((item) => (
            <button key={item.value} type="button" onClick={() => setSelectedTemplate(item.value)} className={`rounded-[18px] border p-4 text-left transition ${selectedTemplate === item.value ? "border-[var(--ui-brand)] bg-[var(--ui-brand-soft)]/40 ring-2 ring-[color:var(--ui-brand)]/10" : "border-[var(--ui-line)] bg-white hover:border-[color:var(--ui-brand)]/35"}`}>
              <p className="font-black">{item.label}</p>
              <p className="mt-2 text-xs leading-5 ui-muted">{item.description}</p>
            </button>
          ))}
        </div>
      </section>

      <div className="sticky bottom-20 z-20 flex flex-col gap-3 rounded-[18px] border border-[var(--ui-line)] bg-[color:var(--ui-surface)]/96 p-4 shadow-[var(--ui-shadow-md)] backdrop-blur sm:flex-row sm:items-center sm:justify-between lg:bottom-4">
        <p className="text-sm font-bold text-[var(--ui-muted)]">{dirty ? "主题或布局有未保存修改。" : "当前主题和布局已保存。"}</p>
        <button type="button" disabled={!dirty || saving} onClick={() => void onSave(selectedTheme, selectedTemplate)} className="ui-button-primary disabled:cursor-not-allowed disabled:opacity-45">{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{saving ? "正在保存…" : "保存主题"}</button>
      </div>
    </div>
  );
}
