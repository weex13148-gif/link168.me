"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, LayoutTemplate, Loader2, Palette, Save, Settings, Trash2, Upload } from "lucide-react";
import { type AvatarFrame, type AvatarMode, type BackgroundType, type ButtonStyle, type CardStyle, type CustomTheme } from "@/components/theme/types";
import { normalizeCustomTheme, validateCustomTheme } from "@/components/theme/normalize";
import { getPresetThemeV2, listPresetThemeNamesV2, isFreeThemeV2 } from "@/components/theme/presetThemes";
import { BUILT_IN_WALLPAPERS } from "@/components/theme/wallpapers";
import { RangeControl } from "@/components/dashboard-v1/RangeControl";

type AppearanceTab = "themes" | "custom" | "system";

export type AppearancePreviewState = {
  themeName: string;
  template: string;
  customTheme: string | null;
};

type AppearancePanelProps = {
  theme: string;
  template: string;
  customThemes: string[];
  customTheme: string | null;
  isPublic: boolean;
  language: string;
  contactVisibility: string;
  saving: boolean;
  onSave: (theme: string, template: string) => Promise<boolean>;
  onSaveCustom: (customTheme: CustomTheme) => Promise<boolean>;
  onSaveSystem: (settings: { isPublic: boolean; language: string; contactVisibility: string }) => Promise<boolean>;
  onPreviewChange: (state: AppearancePreviewState) => void;
  onUpgrade: () => void;
};

function parseCustomTheme(value: string | null | undefined): CustomTheme {
  return normalizeCustomTheme(null, value || null);
}

function updateCustomField<K extends keyof CustomTheme>(theme: CustomTheme, field: K, value: CustomTheme[K]): CustomTheme {
  return validateCustomTheme({ ...theme, [field]: value }).sanitized;
}

function BackgroundUploadField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/dashboard/media/background", { method: "POST", body: formData });
      const data = (await response.json().catch(() => ({}))) as { success?: boolean; imageUrl?: string; error?: string };
      if (!response.ok || !data.success || !data.imageUrl) {
        setError(data.error || "上传失败");
        return;
      }
      onChange(data.imageUrl);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-2 lg:col-span-2">
      <span className="text-sm font-black">背景图片</span>
      <div className="flex flex-wrap gap-1 rounded-lg bg-[var(--ui-surface-muted)] p-1">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-black transition ${mode === "upload" ? "bg-white text-[var(--ui-brand-hover)] shadow-sm" : "text-[var(--ui-muted)]"}`}
        >
          上传本地图片
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-black transition ${mode === "url" ? "bg-white text-[var(--ui-brand-hover)] shadow-sm" : "text-[var(--ui-muted)]"}`}
        >
          填写网络图片链接
        </button>
      </div>

      {mode === "upload" ? (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={loading} className="ui-button-secondary disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {loading ? "上传中" : "选择图片上传"}
          </button>
          <span className="text-xs ui-muted">支持 JPG / PNG / WEBP</span>
        </div>
      ) : (
        <input type="url" value={value} onChange={(event) => onChange(event.target.value)} placeholder="https://example.com/background.jpg" className="ui-input min-w-[200px] flex-1" />
      )}

      {value ? (
        <div className="mt-2 flex items-end gap-2">
          <div className="h-24 flex-1 overflow-hidden rounded-xl border border-[var(--ui-line)] bg-white">
            <img src={value} alt="" className="size-full object-cover" />
          </div>
          <button type="button" onClick={() => onChange("")} className="ui-button-quiet text-[var(--ui-danger)]"><Trash2 className="size-4" />删除背景</button>
        </div>
      ) : null}
      {error ? <p className="text-xs text-[var(--ui-danger)]">{error}</p> : null}
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
    </div>
  );
}

export function AppearancePanel({
  theme,
  template,
  customThemes,
  customTheme,
  isPublic,
  language,
  contactVisibility,
  saving,
  onSave,
  onSaveCustom,
  onSaveSystem,
  onPreviewChange,
  onUpgrade,
}: AppearancePanelProps) {
  const [activeTab, setActiveTab] = useState<AppearanceTab>("themes");
  const [selectedTheme, setSelectedTheme] = useState(theme || "草木原色");
  const [selectedTemplate, setSelectedTemplate] = useState(template || "business");
  const [customDraft, setCustomDraft] = useState<CustomTheme>(() => parseCustomTheme(customTheme));
  const [savedCustomTheme, setSavedCustomTheme] = useState<CustomTheme>(() => parseCustomTheme(customTheme));
  const [systemDraft, setSystemDraft] = useState({ isPublic, language: language || "zh", contactVisibility: contactVisibility || "public" });

  useEffect(() => setSelectedTheme(theme || "草木原色"), [theme]);
  useEffect(() => setSelectedTemplate(template || "business"), [template]);
  useEffect(() => {
    const next = parseCustomTheme(customTheme);
    setCustomDraft(next);
    setSavedCustomTheme(next);
  }, [customTheme]);
  useEffect(() => setSystemDraft({ isPublic, language: language || "zh", contactVisibility: contactVisibility || "public" }), [isPublic, language, contactVisibility]);
  useEffect(() => {
    onPreviewChange({
      themeName: selectedTheme,
      template: selectedTemplate,
      customTheme: activeTab === "custom" ? JSON.stringify(customDraft) : activeTab === "themes" ? null : customTheme,
    });
  }, [activeTab, customDraft, customTheme, onPreviewChange, selectedTemplate, selectedTheme]);

  const presetThemeNames = listPresetThemeNamesV2();
  const themesDirty = selectedTheme !== theme || selectedTemplate !== template;
  const customDirty = useMemo(() => JSON.stringify(customDraft) !== JSON.stringify(savedCustomTheme), [customDraft, savedCustomTheme]);
  const systemDirty = systemDraft.isPublic !== isPublic || systemDraft.language !== language || systemDraft.contactVisibility !== contactVisibility;

  function canUseTheme(name: string) {
    return isFreeThemeV2(name) || customThemes.includes(name);
  }

  function chooseTheme(name: string) {
    if (!canUseTheme(name)) {
      onUpgrade();
      return;
    }
    setSelectedTheme(name);
  }

  async function saveCustomTheme() {
    const next = validateCustomTheme(customDraft).sanitized;
    if (await onSaveCustom(next)) setSavedCustomTheme(next);
  }

  async function saveSystemSettings() {
    const previous = { isPublic, language: language || "zh", contactVisibility: contactVisibility || "public" };
    if (!await onSaveSystem(systemDraft)) setSystemDraft(previous);
  }

  const templates = [
    { value: "business", label: "商务名片", description: "结构清晰，适合顾问、商家和个人服务。" },
    { value: "creator", label: "创作者主页", description: "突出头像、简介和内容平台入口。" },
    { value: "conversion", label: "转化主页", description: "强调核心行动按钮和咨询入口。" },
  ];

  const tabs: { key: AppearanceTab; label: string; icon: React.ReactNode }[] = [
    { key: "themes", label: "主题", icon: <Palette className="size-4" /> },
    { key: "custom", label: "自定义", icon: <LayoutTemplate className="size-4" /> },
    { key: "system", label: "系统设置", icon: <Settings className="size-4" /> },
  ];

  return (
    <fieldset disabled={saving} className="m-0 grid min-w-0 gap-5 border-0 p-0">
      <header>
        <p className="ui-eyebrow">主题装修</p>
        <h1 className="mt-1 text-2xl ui-title sm:text-3xl">打造你的专属主页风格</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 ui-muted">选择预设主题、自定义视觉细节或调整主页公开状态。</p>
      </header>

      <div className="flex gap-1 rounded-xl bg-[var(--ui-surface-muted)] p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-black transition ${activeTab === tab.key ? "bg-white text-[var(--ui-brand)] shadow-sm" : "text-[var(--ui-muted)] hover:text-[var(--ui-ink)]"}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "themes" ? (
        <section className="ui-surface p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[var(--ui-brand-soft)] text-[var(--ui-brand-hover)]"><Palette className="size-5" /></span>
            <div>
              <h2 className="text-lg font-black">预设主题</h2>
              <p className="mt-1 text-xs ui-muted">点击主题后先预览，保存后应用到公开主页。</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {presetThemeNames.map((name) => {
              const preset = getPresetThemeV2(name);
              if (!preset) return null;
              const locked = !canUseTheme(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => chooseTheme(name)}
                  className={`relative overflow-hidden rounded-[18px] border p-3 text-left transition ${selectedTheme === name ? "border-[var(--ui-brand)] ring-2 ring-[color:var(--ui-brand)]/15" : "border-[var(--ui-line)] hover:border-[color:var(--ui-brand)]/35"}`}
                >
                  <div className="h-24 rounded-xl p-3" style={{ background: preset.backgroundType === "image" ? "#f3f4f6" : preset.backgroundValue }}>
                    <div className="h-full rounded-xl bg-white/85 p-3 shadow-sm">
                      <span className="block h-3 w-20 rounded-full bg-black/30" />
                      <span className="mt-3 block h-8 rounded-lg bg-black/10" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="font-black">{name}</span>
                    {isFreeThemeV2(name) ? <span className="rounded-full bg-[var(--ui-success-soft)] px-2 py-1 text-[10px] font-black text-[var(--ui-success)]">免费</span> : <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ui-accent-soft)] px-2 py-1 text-[10px] font-black text-[#8C612E]"><Crown className="size-3" />会员</span>}
                  </div>
                  {locked ? <div className="absolute inset-0 grid place-items-center bg-white/62 backdrop-blur-[1px]"><span className="rounded-full bg-[var(--ui-ink)] px-3 py-1.5 text-xs font-black text-white">升级后使用</span></div> : null}
                </button>
              );
            })}
          </div>

          <div className="mt-6 border-t border-[var(--ui-line)] pt-5">
            <h3 className="font-black">内容布局</h3>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {templates.map((item) => (
                <button key={item.value} type="button" onClick={() => setSelectedTemplate(item.value)} className={`rounded-[18px] border p-4 text-left transition ${selectedTemplate === item.value ? "border-[var(--ui-brand)] bg-[var(--ui-brand-soft)]/40 ring-2 ring-[color:var(--ui-brand)]/10" : "border-[var(--ui-line)] bg-white hover:border-[color:var(--ui-brand)]/35"}`}>
                  <p className="font-black">{item.label}</p>
                  <p className="mt-2 text-xs leading-5 ui-muted">{item.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button type="button" disabled={!themesDirty || saving} onClick={() => void onSave(selectedTheme, selectedTemplate)} className="ui-button-primary disabled:cursor-not-allowed disabled:opacity-45">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? "正在保存" : "保存主题"}
            </button>
          </div>
        </section>
      ) : null}

      {activeTab === "custom" ? (
        <section className="ui-surface p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[var(--ui-info-soft)] text-[var(--ui-info)]"><LayoutTemplate className="size-5" /></span>
            <div>
              <h2 className="text-lg font-black">自定义主题</h2>
              <p className="mt-1 text-xs ui-muted">调整背景、文字、卡片和按钮样式。</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="grid gap-3 lg:col-span-2">
              <div>
                <h3 className="text-sm font-black">内置壁纸</h3>
                <p className="mt-1 text-xs ui-muted">选择后立即预览，保存后才会发布到公开主页。</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {BUILT_IN_WALLPAPERS.map((wallpaper) => {
                  const selected = customDraft.backgroundType === "image" && customDraft.backgroundValue === wallpaper.src;
                  return (
                    <button
                      key={wallpaper.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setCustomDraft((current) => validateCustomTheme({
                        ...current,
                        backgroundType: "image",
                        backgroundValue: wallpaper.src,
                      }).sanitized)}
                      className={`overflow-hidden rounded-[16px] border bg-white p-2 text-left transition-colors duration-200 motion-reduce:transition-none ${selected ? "border-[var(--ui-brand)] ring-2 ring-[color:var(--ui-brand)]/15" : "border-[var(--ui-line)] hover:border-[color:var(--ui-brand)]/35"}`}
                    >
                      <span
                        aria-hidden="true"
                        className="block h-20 rounded-xl bg-cover bg-center"
                        style={{ backgroundImage: `url(${wallpaper.src}), ${wallpaper.fallback}` }}
                      />
                      <span className="mt-2 block text-xs font-black">{wallpaper.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-black">背景类型</span>
              <select value={customDraft.backgroundType} onChange={(event) => setCustomDraft((prev) => updateCustomField(prev, "backgroundType", event.target.value as BackgroundType))} className="ui-input">
                <option value="solid">纯色</option>
                <option value="gradient">渐变</option>
                <option value="image">图片</option>
              </select>
            </label>

            {customDraft.backgroundType === "image" ? (
              <BackgroundUploadField value={customDraft.backgroundValue} onChange={(url) => setCustomDraft((prev) => updateCustomField(prev, "backgroundValue", url))} />
            ) : (
              <label className="grid gap-2">
                <span className="text-sm font-black">背景值</span>
                <input value={customDraft.backgroundValue} onChange={(event) => setCustomDraft((prev) => updateCustomField(prev, "backgroundValue", event.target.value))} className="ui-input" />
              </label>
            )}

            <label className="grid gap-2">
              <span className="text-sm font-black">文字颜色</span>
              <input type="color" value={customDraft.textColor} onChange={(event) => setCustomDraft((prev) => updateCustomField(prev, "textColor", event.target.value))} className="h-11 w-20 cursor-pointer rounded-xl border border-[var(--ui-line)]" />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-black">卡片样式</span>
              <select value={customDraft.cardStyle} onChange={(event) => setCustomDraft((prev) => updateCustomField(prev, "cardStyle", event.target.value as CardStyle))} className="ui-input">
                <option value="solid">实心</option>
                <option value="glass">玻璃</option>
                <option value="outline">描边</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-black">按钮样式</span>
              <select value={customDraft.buttonStyle} onChange={(event) => setCustomDraft((prev) => updateCustomField(prev, "buttonStyle", event.target.value as ButtonStyle))} className="ui-input">
                <option value="solid">实心</option>
                <option value="outline">描边</option>
                <option value="soft">柔和</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-black">头像形状</span>
              <select value={customDraft.avatarFrame} onChange={(event) => setCustomDraft((prev) => updateCustomField(prev, "avatarFrame", event.target.value as AvatarFrame))} className="ui-input">
                <option value="circle">圆形</option>
                <option value="rounded">圆角</option>
                <option value="square">方形</option>
                <option value="ring">光环</option>
              </select>
            </label>

            <fieldset className="grid gap-2 lg:col-span-2">
              <legend className="text-sm font-black">身份图片显示方式</legend>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: "portrait", label: "人物头像", description: "裁切为圆形或圆角头像" },
                  { value: "logo", label: "企业标志", description: "完整显示横向品牌标志" },
                ] as const).map((item) => (
                  <label key={item.value} className={`cursor-pointer rounded-xl border p-3 transition-colors duration-200 motion-reduce:transition-none ${customDraft.avatarMode === item.value ? "border-[var(--ui-brand)] bg-[var(--ui-brand-soft)]/40" : "border-[var(--ui-line)] bg-white"}`}>
                    <span className="flex items-center gap-2 text-sm font-black">
                      <input
                        aria-label={item.label}
                        type="radio"
                        name="avatar-mode"
                        value={item.value}
                        checked={customDraft.avatarMode === item.value}
                        onChange={() => setCustomDraft((current) => updateCustomField(current, "avatarMode", item.value as AvatarMode))}
                        className="accent-[var(--ui-brand)]"
                      />
                      {item.label}
                    </span>
                    <span className="mt-1 block pl-5 text-xs ui-muted">{item.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <RangeControl label="卡片透明度" value={customDraft.cardOpacity} min={0} max={100} unit="%" onChange={(value) => setCustomDraft((current) => updateCustomField(current, "cardOpacity", value))} />
            <RangeControl label="按钮圆角" value={customDraft.buttonRadius} min={0} max={32} unit="px" onChange={(value) => setCustomDraft((current) => updateCustomField(current, "buttonRadius", value))} />
            <RangeControl label="模块间距" value={customDraft.moduleGap} min={0} max={32} unit="px" onChange={(value) => setCustomDraft((current) => updateCustomField(current, "moduleGap", value))} />
          </div>

          <div className="mt-6 flex justify-end">
            <button type="button" disabled={!customDirty || saving} onClick={() => void saveCustomTheme()} className="ui-button-primary disabled:cursor-not-allowed disabled:opacity-45">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? "正在保存" : "保存自定义主题"}
            </button>
          </div>
        </section>
      ) : null}

      {activeTab === "system" ? (
        <section className="ui-surface p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[var(--ui-accent-soft)] text-[#8C612E]"><Settings className="size-5" /></span>
            <div>
              <h2 className="text-lg font-black">系统设置</h2>
              <p className="mt-1 text-xs ui-muted">管理主页公开状态、语言和联系方式可见性。</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="grid gap-2">
              <span className="text-sm font-black">公开状态</span>
              <div className="flex items-center gap-3 rounded-xl border border-[var(--ui-line)] bg-white p-4">
                <button
                  type="button"
                  role="switch"
                  aria-label="公开主页"
                  aria-checked={systemDraft.isPublic}
                  onClick={() => setSystemDraft((current) => ({ ...current, isPublic: !current.isPublic }))}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 motion-reduce:transition-none ${systemDraft.isPublic ? "bg-[var(--ui-brand)]" : "bg-[var(--ui-line)]"}`}
                >
                  <span className={`absolute top-1 size-5 rounded-full bg-white transition-transform duration-200 motion-reduce:transition-none ${systemDraft.isPublic ? "translate-x-6" : "translate-x-1"}`} />
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-black">{systemDraft.isPublic ? "主页公开中" : "主页已下线"}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${systemDraft.isPublic ? "bg-[var(--ui-success-soft)] text-[var(--ui-success)]" : "bg-[var(--ui-surface-muted)] text-[var(--ui-muted)]"}`}>{systemDraft.isPublic ? "公开中" : "已下线"}</span>
                  </div>
                  <p className="text-xs ui-muted">{systemDraft.isPublic ? "任何人都可以访问你的主页" : "只有你自己可以查看"}</p>
                </div>
              </div>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-black">语言</span>
              <select value={systemDraft.language} onChange={(event) => setSystemDraft((prev) => ({ ...prev, language: event.target.value }))} className="ui-input">
                <option value="zh">简体中文</option>
                <option value="en">English</option>
              </select>
            </label>

            <label className="grid gap-2 lg:col-span-2">
              <span className="text-sm font-black">联系方式可见性</span>
              <select value={systemDraft.contactVisibility} onChange={(event) => setSystemDraft((prev) => ({ ...prev, contactVisibility: event.target.value }))} className="ui-input">
                <option value="public">公开可见</option>
                <option value="contacts_only">仅联系人可见</option>
                <option value="private">仅自己可见</option>
              </select>
              <p className="text-xs ui-muted">控制你的电话、邮箱、微信等联系方式对谁可见。</p>
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <button type="button" disabled={!systemDirty || saving} onClick={() => void saveSystemSettings()} className="ui-button-primary disabled:cursor-not-allowed disabled:opacity-45">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? "正在保存" : "保存设置"}
            </button>
          </div>
        </section>
      ) : null}
    </fieldset>
  );
}
