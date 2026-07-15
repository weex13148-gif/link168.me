"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Copy, Eye, EyeOff, Link2, Loader2, Pencil, Plus, Save, Trash2, Upload, X, RefreshCw, PlusCircle, MinusCircle } from "lucide-react";
import type { DashboardLink, LinkComponentType, LinkDraft } from "@/components/dashboard-v1/types";
import { emptyLinkDraft, isValidHttpUrl } from "@/components/dashboard-v1/types";
import {
  getDefaultIconForUrl,
  getPlatformIconOptions,
  resolvePlatformIcon,
  type PlatformIconKey,
} from "@/lib/link-icons";
import { AddModuleDrawer } from "@/components/dashboard-v1/AddModuleDrawer";
import { getModuleDefinition, listAllModules } from "@/features/profile-modules";
import type { ProfileModuleType, CarouselImageItem } from "@/features/profile-modules";

type ProductOption = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  price_text: string | null;
  cover_image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
};

function parsePayloadJson(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
}

function payloadField(payloadJson: string, field: string): string {
  const obj = parsePayloadJson(payloadJson);
  return typeof obj[field] === "string" ? obj[field] as string : "";
}

function setPayloadField(payloadJson: string, field: string, value: string): string {
  const obj = parsePayloadJson(payloadJson);
  if (value) obj[field] = value; else delete obj[field];
  return JSON.stringify(obj);
}

function setPayloadBoolean(payloadJson: string, field: string, value: boolean): string {
  const obj = parsePayloadJson(payloadJson);
  obj[field] = value;
  return JSON.stringify(obj);
}

function payloadBool(payloadJson: string, field: string, defaultValue: boolean): boolean {
  const obj = parsePayloadJson(payloadJson);
  return typeof obj[field] === "boolean" ? obj[field] as boolean : defaultValue;
}

function getCarouselImages(payloadJson: string): CarouselImageItem[] {
  const obj = parsePayloadJson(payloadJson);
  if (Array.isArray(obj.images)) {
    return obj.images.filter((item): item is CarouselImageItem =>
      item && typeof item === "object" && typeof (item as Record<string, unknown>).imageUrl === "string"
    );
  }
  return [];
}

function setCarouselImages(payloadJson: string, images: CarouselImageItem[]): string {
  const obj = parsePayloadJson(payloadJson);
  obj.images = images;
  return JSON.stringify(obj);
}

type IconMode = "default" | "emoji" | "custom" | "platform" | "favicon";

function iconTypeToMode(iconType: string): IconMode {
  if (iconType === "emoji") return "emoji";
  if (iconType === "custom") return "custom";
  if (iconType === "platform") return "platform";
  return "default";
}

function draftFromLink(link: DashboardLink): LinkDraft {
  return {
    title: link.title,
    url: link.url,
    description: link.description || "",
    iconType: link.icon_type || "default",
    iconValue: link.icon_value || "",
    iconUrl: link.icon_url || "",
    componentType: (link.type || "link") as LinkDraft["componentType"],
    payloadJson: link.payload_json || "",
  };
}

const ALL_MODULES = listAllModules();

const COMPONENT_TYPE_OPTIONS = ALL_MODULES.map((mod) => ({
  value: mod.type as LinkComponentType,
  label: mod.label,
  icon: mod.iconName,
  free: mod.free,
}));

function IconPresetPicker({ value, onPick }: { value: string; onPick: (value: string) => void }) {
  const ICON_PRESETS = ["🔗", "⭐", "📱", "🎬", "📕", "🛒", "📩", "☎️", "📍", "💬", "🎧", "📄", "🎁", "📅", "🚀", "💼"];
  return (
    <div className="grid gap-2 lg:col-span-2">
      <span className="text-xs font-black ui-muted">常用图标</span>
      <div className="flex flex-wrap gap-2">
        {ICON_PRESETS.map((icon) => (
          <button key={icon} type="button" onClick={() => onPick(icon)} className={`grid size-10 place-items-center rounded-xl border text-lg ${value === icon ? "border-[var(--ui-brand)] bg-[var(--ui-brand-soft)]" : "border-[var(--ui-line)] bg-white"}`}>{icon}</button>
        ))}
      </div>
    </div>
  );
}

function LinkIconPreview({ draft, index }: { draft: LinkDraft; index?: number }) {
  if (draft.iconType === "custom" && draft.iconUrl) {
    return <img src={draft.iconUrl} alt="" className="size-full rounded-xl object-cover" />;
  }
  if (draft.iconType === "emoji" && draft.iconValue) {
    return <span className="text-lg">{draft.iconValue}</span>;
  }
  if (draft.iconType === "platform") {
    const iconPath = resolvePlatformIcon(draft.iconValue);
    if (iconPath) return <img src={iconPath} alt="" className="size-full rounded-xl object-cover" />;
  }
  if (typeof index === "number") {
    return <span className="text-sm font-black">{index + 1}</span>;
  }
  return <Link2 className="size-4" />;
}

function IconEditor({ draft, onChange, url, isNew }: { draft: LinkDraft; onChange: (patch: Partial<LinkDraft>) => void; url: string; isNew?: boolean }) {
  const [mode, setMode] = useState<IconMode>(iconTypeToMode(draft.iconType));
  const [platformSelectionMode, setPlatformSelectionMode] = useState<"auto" | "manual">(
    draft.iconType === "platform" ? "manual" : "auto",
  );
  const [faviconLoading, setFaviconLoading] = useState(false);
  const [faviconError, setFaviconError] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMode(iconTypeToMode(draft.iconType));
  }, [draft.iconType]);

  useEffect(() => {
    if (mode === "platform" && platformSelectionMode === "auto" && url) {
      const icon = getDefaultIconForUrl(url);
      if (draft.iconType !== icon.iconType || draft.iconValue !== icon.iconValue || draft.iconUrl) {
        onChange({ iconType: icon.iconType, iconValue: icon.iconValue, iconUrl: "" });
      }
    }
  }, [draft.iconType, draft.iconUrl, draft.iconValue, mode, onChange, platformSelectionMode, url]);

  async function handleFaviconFetch() {
    if (!url || !isValidHttpUrl(url)) {
      setFaviconError("请先填写有效的网址");
      return;
    }
    setFaviconLoading(true);
    setFaviconError("");
    try {
      const res = await fetch("/api/dashboard/links/favicon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.success && data.favicon) {
        onChange({ iconType: "custom", iconUrl: data.favicon, iconValue: "" });
        setMode("custom");
      } else {
        setFaviconError(data.error || "获取失败");
      }
    } catch {
      setFaviconError("网络错误，请稍后重试");
    } finally {
      setFaviconLoading(false);
    }
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("icon", file);

      const res = await fetch("/api/dashboard/links/icon", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.iconUrl) {
        onChange({ iconType: "custom", iconUrl: data.iconUrl, iconValue: "" });
        setMode("custom");
      } else {
        setUploadError(data.error || "上传失败");
      }
    } catch {
      setUploadError("网络错误，请稍后重试");
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleModeChange(newMode: IconMode) {
    setMode(newMode);
    setFaviconError("");
    setUploadError("");

    if (newMode === "default") {
      onChange({ iconType: "default", iconValue: "", iconUrl: "" });
    } else if (newMode === "emoji") {
      onChange({ iconType: "emoji", iconValue: draft.iconValue || "🔗", iconUrl: "" });
    } else if (newMode === "platform") {
      setPlatformSelectionMode("auto");
      const icon = getDefaultIconForUrl(url);
      onChange({ iconType: icon.iconType, iconValue: icon.iconValue, iconUrl: "" });
    } else if (newMode === "favicon") {
      void handleFaviconFetch();
    } else if (newMode === "custom") {
      fileInputRef.current?.click();
    }
  }

  const labelClass = isNew ? "text-sm font-black" : "text-xs font-black ui-muted";

  return (
    <>
      <label className="grid gap-2">
        <span className={labelClass}>图标类型</span>
        <select value={mode} onChange={(e) => handleModeChange(e.target.value as IconMode)} className="ui-input">
          <option value="default">默认图标</option>
          <option value="platform">平台自动</option>
          <option value="emoji">表情图标</option>
          <option value="favicon">网站 favicon</option>
          <option value="custom">自定义上传</option>
        </select>
      </label>

      <div className="grid gap-2">
        <span className={labelClass}>图标预览</span>
        <div className="grid size-12 place-items-center rounded-xl border border-[var(--ui-line)] bg-white">
          <LinkIconPreview draft={draft} />
        </div>
      </div>

      {mode === "emoji" ? (
        <label className="grid gap-2 lg:col-span-2">
          <span className={labelClass}>表情图标</span>
          <input value={draft.iconValue} onChange={(event) => onChange({ iconValue: event.target.value })} maxLength={8} placeholder="例如：🌟" className="ui-input text-center text-xl" />
        </label>
      ) : null}

      {mode === "emoji" ? (
        <IconPresetPicker value={draft.iconValue} onPick={(icon) => onChange({ iconType: "emoji", iconValue: icon, iconUrl: "" })} />
      ) : null}

      {mode === "platform" ? (
        <div className="grid gap-2 lg:col-span-2">
          <span className={labelClass}>平台识别</span>
          <div className="flex rounded-lg border border-[var(--ui-line)] bg-[var(--ui-surface-muted)] p-1">
            <button type="button" onClick={() => { setPlatformSelectionMode("auto"); const icon = getDefaultIconForUrl(url); onChange({ iconType: icon.iconType, iconValue: icon.iconValue, iconUrl: "" }); }} className={`min-h-9 flex-1 rounded-md px-3 text-xs font-black ${platformSelectionMode === "auto" ? "bg-white text-[var(--ui-brand-hover)] shadow-sm" : "ui-muted"}`}>自动识别</button>
            <button type="button" onClick={() => setPlatformSelectionMode("manual")} className={`min-h-9 flex-1 rounded-md px-3 text-xs font-black ${platformSelectionMode === "manual" ? "bg-white text-[var(--ui-brand-hover)] shadow-sm" : "ui-muted"}`}>手动选择</button>
          </div>
          {platformSelectionMode === "auto" ? (
            <div className="rounded-xl border border-[var(--ui-line)] bg-white p-3 text-sm ui-muted">
              {url ? <span>根据网址识别为：<strong>{getDefaultIconForUrl(url).label}</strong></span> : <span>请先填写网址。</span>}
            </div>
          ) : (
            <select
              value={draft.iconType === "platform" ? draft.iconValue : ""}
              onChange={(event) => onChange({ iconType: "platform", iconValue: event.target.value as PlatformIconKey, iconUrl: "" })}
              className="ui-input"
              aria-label="选择平台图标"
            >
              <option value="" disabled>选择平台</option>
              {getPlatformIconOptions().map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
            </select>
          )}
        </div>
      ) : null}

      {mode === "favicon" ? (
        <div className="grid gap-2 lg:col-span-2">
          <span className={labelClass}>网站 favicon</span>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={handleFaviconFetch} disabled={faviconLoading || !url} className="ui-button-secondary disabled:cursor-not-allowed disabled:opacity-50">
              {faviconLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              {faviconLoading ? "获取中…" : "获取网站图标"}
            </button>
            <span className="text-xs ui-muted">从目标网站获取 favicon 作为图标</span>
          </div>
          {faviconError ? <p className="text-xs text-[var(--ui-danger)]">{faviconError}</p> : null}
        </div>
      ) : null}

      {mode === "custom" ? (
        <div className="grid gap-2 lg:col-span-2">
          <span className={labelClass}>自定义图标</span>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadLoading} className="ui-button-secondary disabled:cursor-not-allowed disabled:opacity-50">
              {uploadLoading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {uploadLoading ? "上传中…" : "选择图片上传"}
            </button>
            <span className="text-xs ui-muted">支持 JPG / PNG / WEBP，最大 500KB</span>
          </div>
          {uploadError ? <p className="text-xs text-[var(--ui-danger)]">{uploadError}</p> : null}
        </div>
      ) : null}

      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
    </>
  );
}

function ImageUploadField({
  label,
  value,
  onChange,
  uploadType,
  labelClass,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  uploadType: "cover" | "popup" | "carousel" | "background";
  labelClass: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`/api/dashboard/media/${uploadType}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.imageUrl) {
        onChange(data.imageUrl);
      } else {
        setError(data.error || "上传失败");
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-2 lg:col-span-2">
      <span className={labelClass}>{label}</span>
      <div className="flex flex-wrap gap-1 rounded-lg bg-[var(--ui-surface-muted)] p-1">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-black transition ${mode === "upload" ? "bg-white text-[var(--ui-brand-hover)] shadow-sm" : "text-[var(--ui-muted)]"}`}
        >
          上传本地文件
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-black transition ${mode === "url" ? "bg-white text-[var(--ui-brand-hover)] shadow-sm" : "text-[var(--ui-muted)]"}`}
        >
          填写外部图片链接
        </button>
      </div>

      {mode === "upload" ? (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={loading} className="ui-button-secondary disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {loading ? "上传中…" : "从设备选择图片"}
          </button>
          <span className="text-xs ui-muted">从本地设备选择图片文件上传，支持 JPG / PNG / WEBP</span>
        </div>
      ) : (
        <div className="grid gap-1">
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="ui-input"
          />
          <span className="text-xs ui-muted">填写已托管在外部的图片地址（以 http:// 或 https:// 开头），不会上传到本站。</span>
        </div>
      )}

      {value ? (
        <div className="mt-2 flex items-end gap-2">
          <div className="grid size-24 place-items-center overflow-hidden rounded-xl border border-[var(--ui-line)] bg-white">
            <img src={value} alt="" className="size-full object-cover" />
          </div>
          <button type="button" onClick={() => onChange("")} className="ui-button-quiet text-[var(--ui-danger)]"><Trash2 className="size-4" />删除图片</button>
        </div>
      ) : null}
      {error ? <p className="text-xs text-[var(--ui-danger)]">{error}</p> : null}
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
    </div>
  );
}

function CarouselEditor({
  payloadJson,
  onChange,
  labelClass,
}: {
  payloadJson: string;
  onChange: (payloadJson: string) => void;
  labelClass: string;
}) {
  const images = getCarouselImages(payloadJson);

  function addImage() {
    const newImages = [...images, { imageUrl: "", alt: "", linkUrl: "" }];
    onChange(setCarouselImages(payloadJson, newImages));
  }

  function removeImage(index: number) {
    const newImages = images.filter((_, i) => i !== index);
    onChange(setCarouselImages(payloadJson, newImages));
  }

  function updateImage(index: number, field: keyof CarouselImageItem, value: string) {
    const newImages = [...images];
    (newImages[index] as Record<string, unknown>)[field] = value;
    onChange(setCarouselImages(payloadJson, newImages));
  }

  return (
    <div className="grid gap-3 lg:col-span-2">
      <div className="flex items-center justify-between">
        <span className={labelClass}>轮播图片列表</span>
        <button type="button" onClick={addImage} className="inline-flex items-center gap-1 text-xs font-black text-[var(--ui-brand)]">
          <PlusCircle className="size-4" />添加图片
        </button>
      </div>
      <div className="grid gap-3">
        {images.map((img, index) => (
          <div key={index} className="rounded-xl border border-[var(--ui-line)] bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-black text-[var(--ui-muted)]">图片 {index + 1}</span>
              <button type="button" onClick={() => removeImage(index)} className="text-[var(--ui-danger)]" aria-label="删除图片">
                <MinusCircle className="size-4" />
              </button>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <ImageUploadField
                  label="图片地址"
                  value={img.imageUrl}
                  onChange={(url) => updateImage(index, "imageUrl", url)}
                  uploadType="carousel"
                  labelClass="text-xs font-black ui-muted"
                />
              </div>
              <label className="grid gap-2">
                <span className="text-xs font-black ui-muted">alt 描述</span>
                <input
                  type="text"
                  value={img.alt || ""}
                  onChange={(e) => updateImage(index, "alt", e.target.value)}
                  placeholder="图片描述"
                  className="ui-input"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-black ui-muted">跳转链接</span>
                <input
                  type="url"
                  value={img.linkUrl || ""}
                  onChange={(e) => updateImage(index, "linkUrl", e.target.value)}
                  placeholder="https://..."
                  className="ui-input"
                />
              </label>
            </div>
          </div>
        ))}
      </div>
      {images.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--ui-line)] bg-[var(--ui-surface-muted)] p-6 text-center text-sm ui-muted">
          暂无图片，点击上方「添加图片」开始添加
        </div>
      ) : null}
    </div>
  );
}

function needsTitleField(ct: LinkComponentType | undefined): boolean {
  return ct !== "divider";
}

function needsIconEditor(ct: LinkComponentType | undefined): boolean {
  return ct === "link";
}

function DynamicFields({ draft, onChange, isNew, products, productsLoading, productsError }: {
  draft: LinkDraft;
  onChange: (patch: Partial<LinkDraft>) => void;
  isNew?: boolean;
  products: ProductOption[];
  productsLoading: boolean;
  productsError: string;
}) {
  const ct = draft.componentType || "link";
  const labelClass = isNew ? "text-sm font-black" : "text-xs font-black ui-muted";

  function updatePayload(field: string, value: string) {
    onChange({ payloadJson: setPayloadField(draft.payloadJson, field, value) });
  }

  return (
    <>
      {needsTitleField(ct) ? (
        <label className="grid gap-2">
          <span className={labelClass}>
            {ct === "group-title" ? "分组名称" : ct === "divider" ? "样式" : "标题"}
          </span>
          <input
            value={draft.title}
            onChange={(event) => {
              const title = event.target.value;
              if (ct === "quote" || ct === "contact-form") {
                onChange({ title, payloadJson: setPayloadField(draft.payloadJson, "title", title) });
              } else {
                onChange({ title });
              }
            }}
            maxLength={60}
            placeholder={ct === "group-title" ? "例如：社交媒体" : "例如：我的官方网站"}
            className="ui-input"
          />
        </label>
      ) : null}

      {ct === "link" ? (
        <label className="grid gap-2">
          <span className={labelClass}>完整网址</span>
          <input
            value={draft.url}
            onChange={(event) => onChange({ url: event.target.value })}
            placeholder="https://example.com"
            className={`ui-input ${draft.url && !isValidHttpUrl(draft.url) ? "!border-[var(--ui-danger)]" : ""}`}
          />
          <span className={`text-xs ${draft.url && !isValidHttpUrl(draft.url) ? "text-[var(--ui-danger)]" : "ui-muted"}`}>
            {draft.url && !isValidHttpUrl(draft.url) ? "请输入有效的网址（以 http:// 或 https:// 开头）。" : "系统不会自动补全或改写网址。"}
          </span>
        </label>
      ) : null}

      {ct === "link" || ct === "shop" || ct === "booking" || ct === "map" || ct === "email" || ct === "address" ? (
        <label className="grid gap-2 lg:col-span-2">
          <span className={labelClass}>描述（选填）</span>
          <input
            value={draft.description}
            onChange={(event) => onChange({ description: event.target.value })}
            maxLength={200}
            placeholder="一句话说明"
            className="ui-input"
          />
        </label>
      ) : null}

      {ct === "text" ? (
        <label className="grid gap-2 lg:col-span-2">
          <span className={labelClass}>文本内容</span>
          <textarea
            value={draft.description}
            onChange={(event) => onChange({ description: event.target.value })}
            maxLength={500}
            rows={4}
            placeholder="输入要展示的文本内容…"
            className="ui-input min-h-[100px] resize-y"
          />
        </label>
      ) : null}

      {ct === "group-title" ? (
        <label className="grid gap-2 lg:col-span-2">
          <span className={labelClass}>描述（选填）</span>
          <input
            value={draft.description}
            onChange={(event) => onChange({ description: event.target.value })}
            maxLength={100}
            placeholder="分组的简短说明"
            className="ui-input"
          />
        </label>
      ) : null}

      {ct === "qr" ? (
        <label className="grid gap-2">
          <span className={labelClass}>二维码内容 / 网址</span>
          <input
            value={draft.url}
            onChange={(event) => onChange({ url: event.target.value })}
            placeholder="https://example.com 或任意文本"
            className="ui-input"
          />
          <span className="text-xs ui-muted">扫码后将打开此链接或显示此内容。</span>
        </label>
      ) : null}

      {ct === "wechat" ? (
        <label className="grid gap-2">
          <span className={labelClass}>微信号</span>
          <input
            value={draft.url}
            onChange={(event) => onChange({ url: event.target.value })}
            placeholder="例如：my_wechat_id"
            className="ui-input"
          />
          <span className="text-xs ui-muted">访客可长按复制微信号。</span>
        </label>
      ) : null}

      {ct === "phone" ? (
        <label className="grid gap-2">
          <span className={labelClass}>电话号码</span>
          <input
            value={draft.url}
            onChange={(event) => onChange({ url: event.target.value })}
            placeholder="例如：13800138000"
            className="ui-input"
          />
          <span className="text-xs ui-muted">访客点击将直接拨打。</span>
        </label>
      ) : null}

      {ct === "email" ? (
        <label className="grid gap-2">
          <span className={labelClass}>邮箱地址</span>
          <input
            value={draft.url}
            onChange={(event) => onChange({ url: event.target.value })}
            placeholder="例如：hello@example.com"
            className="ui-input"
          />
          <span className="text-xs ui-muted">访客点击将唤起邮件客户端。</span>
        </label>
      ) : null}

      {ct === "copy-text" ? (
        <>
          <label className="grid gap-2">
            <span className={labelClass}>标签</span>
            <input
              value={draft.title || payloadField(draft.payloadJson, "label")}
              onChange={(event) => {
                onChange({ title: event.target.value });
                updatePayload("label", event.target.value);
              }}
              maxLength={30}
              placeholder="例如：复制邮箱"
              className="ui-input"
            />
          </label>
          <label className="grid gap-2 lg:col-span-2">
            <span className={labelClass}>复制内容</span>
            <textarea
              value={payloadField(draft.payloadJson, "copyContent")}
              onChange={(event) => updatePayload("copyContent", event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="点击后复制到剪贴板的内容"
              className="ui-input min-h-[80px] resize-y"
            />
          </label>
          <label className="grid gap-2 lg:col-span-2">
            <span className={labelClass}>描述（选填）</span>
            <input
              value={draft.description || payloadField(draft.payloadJson, "description")}
              onChange={(event) => {
                onChange({ description: event.target.value });
                updatePayload("description", event.target.value);
              }}
              maxLength={100}
              placeholder="简短说明"
              className="ui-input"
            />
          </label>
        </>
      ) : null}

      {ct === "divider" ? (
        <label className="grid gap-2">
          <span className={labelClass}>样式</span>
          <select
            value={payloadField(draft.payloadJson, "style") || "line"}
            onChange={(event) => updatePayload("style", event.target.value)}
            className="ui-input"
          >
            <option value="line">细线分隔</option>
            <option value="space">间距留白</option>
          </select>
        </label>
      ) : null}

      {ct === "map" ? (
        <>
          <label className="grid gap-2">
            <span className={labelClass}>地图链接</span>
            <input
              value={draft.url}
              onChange={(event) => onChange({ url: event.target.value })}
              placeholder="https://map.example.com/?q=地址"
              className="ui-input"
            />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>地址</span>
            <input
              value={payloadField(draft.payloadJson, "address")}
              onChange={(event) => updatePayload("address", event.target.value)}
              maxLength={200}
              placeholder="例如：北京市朝阳区xxx路xxx号"
              className="ui-input"
            />
          </label>
        </>
      ) : null}

      {ct === "shop" ? (
        <>
          <label className="grid gap-2">
            <span className={labelClass}>商品名称</span>
            <input
              value={draft.title}
              onChange={(event) => onChange({ title: event.target.value })}
              maxLength={60}
              placeholder="例如：限定款T恤"
              className="ui-input"
            />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>价格</span>
            <input
              value={payloadField(draft.payloadJson, "price")}
              onChange={(event) => updatePayload("price", event.target.value)}
              maxLength={50}
              placeholder="例如：¥99"
              className="ui-input"
            />
          </label>
          <label className="grid gap-2 lg:col-span-2">
            <span className={labelClass}>商品描述</span>
            <textarea
              value={draft.description}
              onChange={(event) => onChange({ description: event.target.value })}
              maxLength={300}
              rows={2}
              placeholder="商品的简短介绍"
              className="ui-input min-h-[60px] resize-y"
            />
          </label>
          <ImageUploadField
            label="商品图片"
            value={payloadField(draft.payloadJson, "imageUrl")}
            onChange={(url) => updatePayload("imageUrl", url)}
            uploadType="cover"
            labelClass={labelClass}
          />
          <label className="grid gap-2 lg:col-span-2">
            <span className={labelClass}>购买链接</span>
            <input
              value={draft.url}
              onChange={(event) => onChange({ url: event.target.value })}
              placeholder="https://shop.example.com/product/123"
              className="ui-input"
            />
          </label>
        </>
      ) : null}

      {ct === "booking" ? (
        <>
          <label className="grid gap-2">
            <span className={labelClass}>标题</span>
            <input
              value={draft.title}
              onChange={(event) => onChange({ title: event.target.value })}
              maxLength={60}
              placeholder="例如：预约咨询"
              className="ui-input"
            />
          </label>
          <label className="grid gap-2 lg:col-span-2">
            <span className={labelClass}>描述</span>
            <textarea
              value={draft.description}
              onChange={(event) => onChange({ description: event.target.value })}
              maxLength={300}
              rows={2}
              placeholder="预约说明"
              className="ui-input min-h-[60px] resize-y"
            />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>价格</span>
            <input
              value={payloadField(draft.payloadJson, "priceText")}
              onChange={(event) => updatePayload("priceText", event.target.value)}
              maxLength={50}
              placeholder="例如：¥199 / 次"
              className="ui-input"
            />
          </label>
          <ImageUploadField
            label="封面图（选填）"
            value={payloadField(draft.payloadJson, "coverImageUrl")}
            onChange={(url) => updatePayload("coverImageUrl", url)}
            uploadType="cover"
            labelClass={labelClass}
          />
          <label className="grid gap-2">
            <span className={labelClass}>可预约时间</span>
            <input
              value={payloadField(draft.payloadJson, "availability")}
              onChange={(event) => updatePayload("availability", event.target.value)}
              maxLength={100}
              placeholder="例如：周一至周五 9:00-18:00"
              className="ui-input"
            />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>时长</span>
            <input
              value={payloadField(draft.payloadJson, "duration")}
              onChange={(event) => updatePayload("duration", event.target.value)}
              maxLength={50}
              placeholder="例如：30 分钟"
              className="ui-input"
            />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-[var(--ui-line)] bg-white px-3 py-2 lg:col-span-2">
            <input
              type="checkbox"
              checked={payloadBool(draft.payloadJson, "requireDate", true)}
              onChange={(event) => onChange({ payloadJson: setPayloadBoolean(draft.payloadJson, "requireDate", event.target.checked) })}
            />
            <span className="text-sm font-black text-[var(--ui-ink)]">提交预约时要求选择日期</span>
          </label>
        </>
      ) : null}

      {ct === "product-card" ? (
        <>
          <label className="grid gap-2 lg:col-span-2">
            <span className={labelClass}>选择已上架产品</span>
            <select
              value={payloadField(draft.payloadJson, "productId")}
              disabled={productsLoading}
              onChange={(event) => {
                const product = products.find((item) => item.id === event.target.value);
                if (!product) return;
                onChange({
                  title: product.name,
                  description: product.description || "",
                  url: product.cta_url || "",
                  payloadJson: JSON.stringify({
                    productId: product.id,
                    name: product.name,
                    ...(product.category ? { category: product.category } : {}),
                    ...(product.description ? { description: product.description } : {}),
                    ...(product.price_text ? { priceText: product.price_text } : {}),
                    ...(product.cover_image_url ? { coverImageUrl: product.cover_image_url } : {}),
                    ...(product.cta_label ? { ctaLabel: product.cta_label } : {}),
                    ...(product.cta_url ? { ctaUrl: product.cta_url } : {}),
                  }),
                });
              }}
              className="ui-input"
            >
              <option value="">{productsLoading ? "正在加载产品…" : "请选择产品"}</option>
              {payloadField(draft.payloadJson, "productId") && !products.some((item) => item.id === payloadField(draft.payloadJson, "productId")) ? (
                <option value={payloadField(draft.payloadJson, "productId")} disabled>当前绑定产品已下架，请重新选择</option>
              ) : null}
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}{product.price_text ? ` · ${product.price_text}` : ""}</option>)}
            </select>
            {productsError ? <span className="text-xs text-[var(--ui-danger)]">{productsError}</span> : null}
            {!productsLoading && !productsError && products.length === 0 ? <span className="text-xs ui-muted">请先在“产品与服务”中新增并上架产品。</span> : null}
          </label>
          {payloadField(draft.payloadJson, "productId") ? (
            <div className="rounded-xl border border-[var(--ui-line)] bg-white p-4 lg:col-span-2">
              <p className="font-black text-[var(--ui-ink)]">{payloadField(draft.payloadJson, "name") || draft.title}</p>
              <p className="mt-1 text-xs ui-muted">{[payloadField(draft.payloadJson, "category"), payloadField(draft.payloadJson, "priceText")].filter(Boolean).join(" · ") || "已绑定产品"}</p>
              {payloadField(draft.payloadJson, "description") ? <p className="mt-2 text-sm leading-6 ui-muted">{payloadField(draft.payloadJson, "description")}</p> : null}
            </div>
          ) : null}
        </>
      ) : null}

      {ct === "service-card" ? (
        <>
          <label className="grid gap-2">
            <span className={labelClass}>服务 ID（选填）</span>
            <input value={payloadField(draft.payloadJson, "serviceId")} onChange={(event) => updatePayload("serviceId", event.target.value)} maxLength={80} placeholder="可关联 Product.id" className="ui-input" />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>名称</span>
            <input value={payloadField(draft.payloadJson, "name") || draft.title} onChange={(event) => { onChange({ title: event.target.value }); updatePayload("name", event.target.value); }} maxLength={60} placeholder="服务名称" className="ui-input" />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>分类</span>
            <input value={payloadField(draft.payloadJson, "category")} onChange={(event) => updatePayload("category", event.target.value)} maxLength={50} placeholder="例如：顾问服务" className="ui-input" />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>价格</span>
            <input value={payloadField(draft.payloadJson, "priceText")} onChange={(event) => updatePayload("priceText", event.target.value)} maxLength={50} placeholder="例如：¥499 / 次" className="ui-input" />
          </label>
          <label className="grid gap-2 lg:col-span-2">
            <span className={labelClass}>简介</span>
            <textarea value={payloadField(draft.payloadJson, "description") || draft.description} onChange={(event) => { onChange({ description: event.target.value }); updatePayload("description", event.target.value); }} maxLength={300} rows={2} placeholder="服务简介" className="ui-input min-h-[60px] resize-y" />
          </label>
          <ImageUploadField label="封面图片" value={payloadField(draft.payloadJson, "coverImageUrl")} onChange={(url) => updatePayload("coverImageUrl", url)} uploadType="cover" labelClass={labelClass} />
          <label className="grid gap-2">
            <span className={labelClass}>可预约时间</span>
            <input value={payloadField(draft.payloadJson, "availability")} onChange={(event) => updatePayload("availability", event.target.value)} maxLength={100} placeholder="例如：工作日 10:00-18:00" className="ui-input" />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>服务时长</span>
            <input value={payloadField(draft.payloadJson, "duration")} onChange={(event) => updatePayload("duration", event.target.value)} maxLength={50} placeholder="例如：60 分钟" className="ui-input" />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>按钮名称</span>
            <input value={payloadField(draft.payloadJson, "ctaLabel")} onChange={(event) => updatePayload("ctaLabel", event.target.value)} maxLength={30} placeholder="例如：查看详情" className="ui-input" />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>按钮链接</span>
            <input value={payloadField(draft.payloadJson, "ctaUrl")} onChange={(event) => updatePayload("ctaUrl", event.target.value)} placeholder="https://..." className="ui-input" />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-[var(--ui-line)] bg-white px-3 py-2 lg:col-span-2">
            <input type="checkbox" checked={payloadBool(draft.payloadJson, "allowBooking", true)} onChange={(event) => onChange({ payloadJson: setPayloadBoolean(draft.payloadJson, "allowBooking", event.target.checked) })} />
            <span className="text-sm font-black text-[var(--ui-ink)]">允许预约</span>
          </label>
        </>
      ) : null}

      {ct === "offer" ? (
        <>
          <label className="grid gap-2">
            <span className={labelClass}>标题</span>
            <input value={payloadField(draft.payloadJson, "title") || draft.title} onChange={(event) => { onChange({ title: event.target.value }); updatePayload("title", event.target.value); }} maxLength={60} placeholder="优惠活动或报价咨询标题" className="ui-input" />
          </label>
          <label className="grid gap-2 lg:col-span-2">
            <span className={labelClass}>描述</span>
            <textarea value={payloadField(draft.payloadJson, "description") || draft.description} onChange={(event) => { onChange({ description: event.target.value }); updatePayload("description", event.target.value); }} maxLength={300} rows={2} placeholder="活动说明" className="ui-input min-h-[60px] resize-y" />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>原价</span>
            <input value={payloadField(draft.payloadJson, "originalPrice")} onChange={(event) => updatePayload("originalPrice", event.target.value)} maxLength={50} placeholder="例如：¥999" className="ui-input" />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>当前价格</span>
            <input value={payloadField(draft.payloadJson, "offerPrice")} onChange={(event) => updatePayload("offerPrice", event.target.value)} maxLength={50} placeholder="例如：¥699" className="ui-input" />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>优惠说明</span>
            <input value={payloadField(draft.payloadJson, "discountText")} onChange={(event) => updatePayload("discountText", event.target.value)} maxLength={80} placeholder="例如：限时 7 折" className="ui-input" />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>有效期至</span>
            <input type="date" value={payloadField(draft.payloadJson, "validUntil")} onChange={(event) => updatePayload("validUntil", event.target.value)} className="ui-input" />
          </label>
          <ImageUploadField label="封面图片" value={payloadField(draft.payloadJson, "coverImageUrl")} onChange={(url) => updatePayload("coverImageUrl", url)} uploadType="cover" labelClass={labelClass} />
          <label className="grid gap-2">
            <span className={labelClass}>按钮名称</span>
            <input value={payloadField(draft.payloadJson, "ctaLabel")} onChange={(event) => updatePayload("ctaLabel", event.target.value)} maxLength={30} placeholder="例如：查看详情" className="ui-input" />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>按钮链接</span>
            <input value={payloadField(draft.payloadJson, "ctaUrl")} onChange={(event) => updatePayload("ctaUrl", event.target.value)} placeholder="https://..." className="ui-input" />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>优惠码</span>
            <input value={payloadField(draft.payloadJson, "couponCode")} onChange={(event) => updatePayload("couponCode", event.target.value)} maxLength={80} placeholder="例如：LINK168" className="ui-input" />
          </label>
        </>
      ) : null}

      {ct === "quote" || ct === "contact-form" ? (
        <>
          <label className="grid gap-2 lg:col-span-2">
            <span className={labelClass}>说明（选填）</span>
            <textarea
              value={payloadField(draft.payloadJson, "description")}
              onChange={(event) => {
                onChange({
                  description: event.target.value,
                  payloadJson: setPayloadField(draft.payloadJson, "description", event.target.value),
                });
              }}
              maxLength={500}
              rows={3}
              placeholder={ct === "quote" ? "说明报价所需的信息" : "说明提交后如何联系"}
              className="ui-input min-h-[72px] resize-y"
            />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>按钮文字</span>
            <input
              value={payloadField(draft.payloadJson, "buttonText")}
              onChange={(event) => updatePayload("buttonText", event.target.value)}
              maxLength={50}
              placeholder={ct === "quote" ? "提交报价需求" : "提交联系信息"}
              className="ui-input"
            />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>需求提示（选填）</span>
            <input
              value={payloadField(draft.payloadJson, "messagePlaceholder")}
              onChange={(event) => updatePayload("messagePlaceholder", event.target.value)}
              maxLength={120}
              placeholder={ct === "quote" ? "项目范围、预算、时间要求" : "想咨询的内容"}
              className="ui-input"
            />
          </label>
        </>
      ) : null}

      {ct === "cover-image" ? (
        <>
          <ImageUploadField
            label="图片URL"
            value={payloadField(draft.payloadJson, "imageUrl")}
            onChange={(url) => updatePayload("imageUrl", url)}
            uploadType="cover"
            labelClass={labelClass}
          />
          <label className="grid gap-2">
            <span className={labelClass}>跳转链接（选填）</span>
            <input
              value={payloadField(draft.payloadJson, "linkUrl")}
              onChange={(event) => updatePayload("linkUrl", event.target.value)}
              placeholder="https://..."
              className="ui-input"
            />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>alt 描述（选填）</span>
            <input
              value={payloadField(draft.payloadJson, "alt")}
              onChange={(event) => updatePayload("alt", event.target.value)}
              placeholder="图片描述"
              className="ui-input"
            />
          </label>
        </>
      ) : null}

      {ct === "popup-image" ? (
        <>
          <ImageUploadField
            label="缩略图URL"
            value={payloadField(draft.payloadJson, "thumbnailUrl")}
            onChange={(url) => updatePayload("thumbnailUrl", url)}
            uploadType="popup"
            labelClass={labelClass}
          />
          <ImageUploadField
            label="大图URL"
            value={payloadField(draft.payloadJson, "fullImageUrl")}
            onChange={(url) => updatePayload("fullImageUrl", url)}
            uploadType="popup"
            labelClass={labelClass}
          />
          <label className="grid gap-2 lg:col-span-2">
            <span className={labelClass}>alt 描述（选填）</span>
            <input
              value={payloadField(draft.payloadJson, "alt")}
              onChange={(event) => updatePayload("alt", event.target.value)}
              placeholder="图片描述"
              className="ui-input"
            />
          </label>
        </>
      ) : null}

      {ct === "carousel" ? (
        <CarouselEditor
          payloadJson={draft.payloadJson}
          onChange={(pj) => onChange({ payloadJson: pj })}
          labelClass={labelClass}
        />
      ) : null}

      {ct === "bilibili-video" ? (
        <>
          <label className="grid gap-2">
            <span className={labelClass}>BV号</span>
            <input
              value={payloadField(draft.payloadJson, "bvid")}
              onChange={(event) => updatePayload("bvid", event.target.value)}
              placeholder="例如：BV1xx411c7mD"
              className="ui-input"
            />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>标题（选填）</span>
            <input
              value={payloadField(draft.payloadJson, "title")}
              onChange={(event) => updatePayload("title", event.target.value)}
              maxLength={100}
              placeholder="视频标题"
              className="ui-input"
            />
          </label>
          <ImageUploadField
            label="封面图（选填）"
            value={payloadField(draft.payloadJson, "coverUrl")}
            onChange={(url) => updatePayload("coverUrl", url)}
            uploadType="cover"
            labelClass={labelClass}
          />
        </>
      ) : null}

      {ct === "youtube-video" ? (
        <>
          <label className="grid gap-2">
            <span className={labelClass}>视频ID</span>
            <input
              value={payloadField(draft.payloadJson, "videoId")}
              onChange={(event) => updatePayload("videoId", event.target.value)}
              placeholder="例如：dQw4w9WgXcQ"
              className="ui-input"
            />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>标题（选填）</span>
            <input
              value={payloadField(draft.payloadJson, "title")}
              onChange={(event) => updatePayload("title", event.target.value)}
              maxLength={100}
              placeholder="视频标题"
              className="ui-input"
            />
          </label>
          <ImageUploadField
            label="封面图（选填）"
            value={payloadField(draft.payloadJson, "coverUrl")}
            onChange={(url) => updatePayload("coverUrl", url)}
            uploadType="cover"
            labelClass={labelClass}
          />
        </>
      ) : null}

      {ct === "video-link" ? (
        <>
          <label className="grid gap-2">
            <span className={labelClass}>视频URL</span>
            <input
              value={payloadField(draft.payloadJson, "url")}
              onChange={(event) => updatePayload("url", event.target.value)}
              placeholder="https://..."
              className="ui-input"
            />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>标题（选填）</span>
            <input
              value={payloadField(draft.payloadJson, "title")}
              onChange={(event) => updatePayload("title", event.target.value)}
              maxLength={100}
              placeholder="视频标题"
              className="ui-input"
            />
          </label>
          <ImageUploadField
            label="封面图（选填）"
            value={payloadField(draft.payloadJson, "coverUrl")}
            onChange={(url) => updatePayload("coverUrl", url)}
            uploadType="cover"
            labelClass={labelClass}
          />
        </>
      ) : null}

      {ct === "netease-music" ? (
        <>
          <label className="grid gap-2">
            <span className={labelClass}>歌曲ID</span>
            <input
              value={payloadField(draft.payloadJson, "songId")}
              onChange={(event) => updatePayload("songId", event.target.value)}
              placeholder="例如：12345678"
              className="ui-input"
            />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>歌曲名（选填）</span>
            <input
              value={payloadField(draft.payloadJson, "title")}
              onChange={(event) => updatePayload("title", event.target.value)}
              maxLength={100}
              placeholder="歌曲名称"
              className="ui-input"
            />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>歌手（选填）</span>
            <input
              value={payloadField(draft.payloadJson, "artist")}
              onChange={(event) => updatePayload("artist", event.target.value)}
              maxLength={100}
              placeholder="歌手名称"
              className="ui-input"
            />
          </label>
          <ImageUploadField
            label="封面图（选填）"
            value={payloadField(draft.payloadJson, "coverUrl")}
            onChange={(url) => updatePayload("coverUrl", url)}
            uploadType="cover"
            labelClass={labelClass}
          />
        </>
      ) : null}

      {ct === "music-link" ? (
        <>
          <label className="grid gap-2">
            <span className={labelClass}>音乐URL</span>
            <input
              value={payloadField(draft.payloadJson, "url")}
              onChange={(event) => updatePayload("url", event.target.value)}
              placeholder="https://..."
              className="ui-input"
            />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>歌曲名（选填）</span>
            <input
              value={payloadField(draft.payloadJson, "title")}
              onChange={(event) => updatePayload("title", event.target.value)}
              maxLength={100}
              placeholder="歌曲名称"
              className="ui-input"
            />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>歌手（选填）</span>
            <input
              value={payloadField(draft.payloadJson, "artist")}
              onChange={(event) => updatePayload("artist", event.target.value)}
              maxLength={100}
              placeholder="歌手名称"
              className="ui-input"
            />
          </label>
          <ImageUploadField
            label="封面图（选填）"
            value={payloadField(draft.payloadJson, "coverUrl")}
            onChange={(url) => updatePayload("coverUrl", url)}
            uploadType="cover"
            labelClass={labelClass}
          />
        </>
      ) : null}

      {ct === "ai-chat" ? (
        <>
          <label className="grid gap-2">
            <span className={labelClass}>助手名称（选填）</span>
            <input
              value={payloadField(draft.payloadJson, "assistantName")}
              onChange={(event) => updatePayload("assistantName", event.target.value)}
              maxLength={30}
              placeholder="例如：小智助手"
              className="ui-input"
            />
          </label>
          <label className="grid gap-2 lg:col-span-2">
            <span className={labelClass}>欢迎语（选填）</span>
            <textarea
              value={payloadField(draft.payloadJson, "greeting")}
              onChange={(event) => updatePayload("greeting", event.target.value)}
              maxLength={200}
              rows={2}
              placeholder="例如：你好！我是AI助手，有什么可以帮你的？"
              className="ui-input min-h-[60px] resize-y"
            />
          </label>
          <label className="grid gap-2">
            <span className={labelClass}>语气风格（选填）</span>
            <select
              value={payloadField(draft.payloadJson, "tone")}
              onChange={(event) => updatePayload("tone", event.target.value)}
              className="ui-input"
            >
              <option value="">默认</option>
              <option value="friendly">友好亲切</option>
              <option value="professional">专业正式</option>
              <option value="humorous">幽默风趣</option>
              <option value="concise">简洁高效</option>
            </select>
          </label>
        </>
      ) : null}

      {needsIconEditor(ct) ? (
        <IconEditor draft={draft} onChange={onChange} url={draft.url} isNew={isNew} />
      ) : null}
    </>
  );
}

function isDraftValid(draft: LinkDraft): boolean {
  const ct = draft.componentType || "link";

  if (ct === "divider") return true;

  if (!draft.title.trim() && ct !== "copy-text") {
    if (ct === "cover-image" || ct === "popup-image" || ct === "carousel" ||
        ct === "bilibili-video" || ct === "youtube-video" || ct === "video-link" ||
        ct === "netease-music" || ct === "music-link" || ct === "ai-chat" ||
        ct === "text" || ct === "product-card" || ct === "service-card" || ct === "offer") {
      // 这些模块标题选填
    } else {
      return false;
    }
  }

  if (ct === "link") {
    if (!isValidHttpUrl(draft.url)) return false;
  }
  if (ct === "qr") {
    if (!draft.url.trim()) return false;
  }
  if (ct === "wechat") {
    if (!draft.url.trim()) return false;
  }
  if (ct === "phone") {
    if (!draft.url.trim()) return false;
  }
  if (ct === "email") {
    if (!draft.url.trim()) return false;
  }
  if (ct === "address") {
    if (!draft.url.trim()) return false;
  }
  if (ct === "shop") {
    if (!draft.url.trim()) return false;
  }
  if (ct === "booking") {
    if (!draft.title.trim()) return false;
  }
  if (ct === "map") {
    if (!draft.url.trim()) return false;
  }
  if (ct === "text") {
    if (!draft.description.trim()) return false;
  }
  if (ct === "copy-text") {
    if (!payloadField(draft.payloadJson, "copyContent").trim()) return false;
  }
  if (ct === "cover-image") {
    if (!payloadField(draft.payloadJson, "imageUrl").trim()) return false;
  }
  if (ct === "popup-image") {
    if (!payloadField(draft.payloadJson, "thumbnailUrl").trim() ||
        !payloadField(draft.payloadJson, "fullImageUrl").trim()) return false;
  }
  if (ct === "carousel") {
    const images = getCarouselImages(draft.payloadJson);
    if (images.length === 0) return false;
    if (!images.every((img) => img.imageUrl.trim())) return false;
  }
  if (ct === "bilibili-video") {
    if (!payloadField(draft.payloadJson, "bvid").trim()) return false;
  }
  if (ct === "youtube-video") {
    if (!payloadField(draft.payloadJson, "videoId").trim()) return false;
  }
  if (ct === "video-link") {
    if (!payloadField(draft.payloadJson, "url").trim()) return false;
  }
  if (ct === "netease-music") {
    if (!payloadField(draft.payloadJson, "songId").trim()) return false;
  }
  if (ct === "music-link") {
    if (!payloadField(draft.payloadJson, "url").trim()) return false;
  }
  if (ct === "product-card") {
    if (!payloadField(draft.payloadJson, "productId").trim()) return false;
  }
  if (ct === "service-card") {
    if (!payloadField(draft.payloadJson, "name").trim() && !draft.title.trim()) return false;
  }
  if (ct === "offer") {
    if (!payloadField(draft.payloadJson, "title").trim() && !draft.title.trim()) return false;
  }

  return true;
}

function componentTypeBadge(ct: string): string {
  const found = COMPONENT_TYPE_OPTIONS.find((o) => o.value === ct);
  return found ? found.label : ct;
}

export function LinksPanel({ links, isPaid, planLabel, creating, busyLinkId, onCreate, onUpdate, onToggle, onDelete, onMove, onCopy, onUpgrade }: {
  links: DashboardLink[];
  isPaid: boolean;
  planLabel: string;
  creating: boolean;
  busyLinkId: string;
  onCreate: (draft: LinkDraft) => Promise<boolean>;
  onUpdate: (link: DashboardLink, draft: LinkDraft) => Promise<boolean>;
  onToggle: (link: DashboardLink) => Promise<void>;
  onDelete: (link: DashboardLink) => Promise<void>;
  onMove: (linkId: string, direction: "up" | "down") => Promise<void>;
  onCopy: (value: string) => void;
  onUpgrade: () => void;
}) {
  const [newOpen, setNewOpen] = useState(false);
  const [newDraft, setNewDraft] = useState<LinkDraft>(emptyLinkDraft);
  const [expandedId, setExpandedId] = useState<string>("");
  const [drafts, setDrafts] = useState<Record<string, LinkDraft>>({});
  const [addModuleOpen, setAddModuleOpen] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");

  useEffect(() => { setDrafts((current) => { const next: Record<string, LinkDraft> = {}; for (const link of links) next[link.id] = current[link.id] || draftFromLink(link); return next; }); }, [links]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard/products?active=1")
      .then(async (response) => {
        const data = await response.json() as { success?: boolean; products?: ProductOption[]; error?: string };
        if (!response.ok || !data.success) throw new Error(data.error || "产品加载失败");
        if (!cancelled) setProducts(data.products || []);
      })
      .catch((error) => { if (!cancelled) setProductsError(error instanceof Error ? error.message : "产品加载失败"); })
      .finally(() => { if (!cancelled) setProductsLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const orderedLinks = useMemo(() => [...links].sort((a, b) => a.position - b.position), [links]);

  async function createLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isDraftValid(newDraft)) return;
    const ok = await onCreate(newDraft);
    if (ok) { setNewDraft(emptyLinkDraft); setNewOpen(false); }
  }

  function updateDraft(id: string, patch: Partial<LinkDraft>) { setDrafts((current) => ({ ...current, [id]: { ...(current[id] || emptyLinkDraft), ...patch } })); }

  function handleModuleSelect(type: ProfileModuleType) {
    setAddModuleOpen(false);
    const mod = getModuleDefinition(type);
    if (!mod) return;

    if (!mod.free && !isPaid) {
      onUpgrade();
      return;
    }

    const draft: LinkDraft = {
      ...emptyLinkDraft,
      componentType: type as LinkComponentType,
      title: mod.label,
    };

    if (type === "product-card") {
      draft.payloadJson = JSON.stringify({ name: mod.label });
    } else if (type === "service-card") {
      draft.payloadJson = JSON.stringify({ name: mod.label, allowBooking: true });
    } else if (type === "offer") {
      draft.payloadJson = JSON.stringify({ title: mod.label });
    } else if (type === "quote" || type === "contact-form") {
      draft.payloadJson = JSON.stringify({
        title: mod.label,
        buttonText: type === "quote" ? "提交报价需求" : "提交联系信息",
      });
    }

    if (type === "text" || type === "group-title" || type === "divider" ||
        type === "cover-image" || type === "popup-image" || type === "carousel" ||
        type === "bilibili-video" || type === "youtube-video" || type === "video-link" ||
        type === "netease-music" || type === "music-link" || type === "ai-chat" ||
        type === "quote" || type === "contact-form") {
      draft.url = "";
    }

    if (type === "divider") {
      draft.title = "";
    }

    setNewDraft(draft);
    setNewOpen(true);
  }

  function handleComponentTypeChange(draft: LinkDraft, setter: (patch: Partial<LinkDraft>) => void, newType: LinkComponentType) {
    const patch: Partial<LinkDraft> = { componentType: newType };

    if (newType === "text" || newType === "group-title" || newType === "divider" ||
        newType === "cover-image" || newType === "popup-image" || newType === "carousel" ||
        newType === "bilibili-video" || newType === "youtube-video" || newType === "video-link" ||
        newType === "netease-music" || newType === "music-link" || newType === "ai-chat" ||
        newType === "quote" || newType === "contact-form") {
      patch.url = "";
    }

    if (!needsIconEditor(newType)) {
      patch.iconType = "default";
      patch.iconValue = "";
      patch.iconUrl = "";
    }

    if (newType !== "shop" && newType !== "booking" &&
        newType !== "product-card" && newType !== "service-card" && newType !== "offer" &&
        newType !== "quote" && newType !== "contact-form" &&
        newType !== "map" &&
        newType !== "copy-text" && newType !== "divider" &&
        newType !== "cover-image" && newType !== "popup-image" && newType !== "carousel" &&
        newType !== "bilibili-video" && newType !== "youtube-video" && newType !== "video-link" &&
        newType !== "netease-music" && newType !== "music-link" && newType !== "ai-chat") {
      patch.payloadJson = "";
    }

    if (newType === "divider") {
      patch.title = "";
    }
    if (newType === "quote" || newType === "contact-form") {
      patch.title = getModuleDefinition(newType)?.label || "";
      patch.payloadJson = JSON.stringify({
        title: patch.title,
        buttonText: newType === "quote" ? "提交报价需求" : "提交联系信息",
      });
    }

    setter(patch);
  }

  function renderLinkIcon(link: DashboardLink, index: number) {
    if (link.icon_type === "custom" && link.icon_url) {
      return <img src={link.icon_url} alt="" className="size-full rounded-xl object-cover" />;
    }
    if (link.icon_type === "emoji" && link.icon_value) {
      return <span className="text-sm">{link.icon_value}</span>;
    }
    if (link.icon_type === "platform") {
      const iconPath = resolvePlatformIcon(link.icon_value);
      if (iconPath) return <img src={iconPath} alt="" className="size-full rounded-xl object-cover" />;
    }
    const ct = link.type || "link";
    const found = COMPONENT_TYPE_OPTIONS.find((o) => o.value === ct);
    if (found) return <span className="text-sm font-black">{found.label.charAt(0)}</span>;
    return <span className="text-sm font-black">{index + 1}</span>;
  }

  function hasChanges(link: DashboardLink, draft: LinkDraft): boolean {
    return draft.title !== link.title
      || draft.url !== link.url
      || draft.description !== (link.description || "")
      || draft.iconType !== link.icon_type
      || draft.iconValue !== (link.icon_value || "")
      || draft.iconUrl !== (link.icon_url || "")
      || draft.componentType !== (link.type || "link")
      || draft.payloadJson !== (link.payload_json || "");
  }

  return (
    <div className="grid gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="ui-eyebrow">我的链接</p>
          <h1 className="mt-1 text-xl ui-title sm:text-2xl">管理公开入口</h1>
          <p className="mt-2 text-xs leading-5 ui-muted sm:text-sm sm:leading-6">链接不会被改写成短链。显示、隐藏、排序和编辑都会真实写入数据库。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setAddModuleOpen(true)} className="ui-button-primary"><Plus className="size-4" />添加内容</button>
        </div>
      </header>

      {!isPaid ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--ui-line)] bg-[var(--ui-surface)] px-4 py-3 text-sm">
          <span className="font-bold text-[var(--ui-muted)]">{planLabel}支持无限链接</span>
          <span className="font-black text-[var(--ui-brand-hover)]">已创建 {links.length} 个</span>
        </div>
      ) : null}

      {newOpen ? (
        <form onSubmit={createLink} className="ui-surface p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="ui-eyebrow">新增内容</p>
              <h2 className="mt-1 text-xl ui-title">选择类型并填写</h2>
            </div>
            <button type="button" onClick={() => setNewOpen(false)} className="grid size-9 place-items-center rounded-xl bg-[var(--ui-surface-muted)]" aria-label="关闭"><X className="size-4" /></button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2 lg:col-span-2">
              <span className="text-sm font-black">模块类型</span>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 lg:grid-cols-4">
                {COMPONENT_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      if (!opt.free && !isPaid) {
                        onUpgrade();
                        return;
                      }
                      handleComponentTypeChange(newDraft, (patch) => setNewDraft((current) => ({ ...current, ...patch })), opt.value);
                    }}
                    className={`inline-flex min-h-10 items-center justify-center gap-1 truncate rounded-lg border px-2 text-xs font-black transition sm:gap-1.5 sm:rounded-xl sm:px-3 sm:py-2 ${(newDraft.componentType || "link") === opt.value ? "border-[var(--ui-brand)] bg-[var(--ui-brand-soft)] text-[var(--ui-brand-hover)]" : "border-[var(--ui-line)] bg-white text-[var(--ui-muted)] hover:border-[var(--ui-brand)]/50"} ${!opt.free && !isPaid ? "opacity-60" : ""}`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {!opt.free ? <span className="text-[10px] text-[var(--ui-brand)]">Pro</span> : null}
                  </button>
                ))}
              </div>
            </label>

            <DynamicFields draft={newDraft} onChange={(patch) => setNewDraft((current) => ({ ...current, ...patch }))} isNew products={products} productsLoading={productsLoading} productsError={productsError} />
          </div>

          <div className="mt-5 grid gap-2 border-t border-[var(--ui-line)] pt-5 sm:flex sm:justify-end sm:gap-2">
            <button type="button" onClick={() => setNewOpen(false)} className="ui-button-secondary w-full sm:w-auto">取消</button>
            <button type="submit" disabled={creating || !isDraftValid(newDraft)} className="ui-button-primary w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
              {creating ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {creating ? "正在创建…" : "保存并公开"}
            </button>
          </div>
        </form>
      ) : null}

      <section className="ui-surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--ui-line)] px-5 py-4">
          <div>
            <h2 className="font-black">内容列表</h2>
            <p className="mt-1 text-xs ui-muted">共 {links.length} 个内容，已公开 {links.filter((link) => link.is_active).length} 个</p>
          </div>
        </div>

        {orderedLinks.length === 0 ? (
        <button type="button" onClick={() => setAddModuleOpen(true)} className="grid min-h-48 w-full place-items-center p-4 text-center sm:min-h-64 sm:p-8">
          <span>
            <span className="mx-auto grid size-10 place-items-center rounded-xl bg-[var(--ui-brand-soft)] text-[var(--ui-brand-hover)] sm:size-12"><Plus className="size-5 sm:size-6" /></span>
            <strong className="mt-3 block">还没有内容</strong>
            <span className="mt-1 block text-xs ui-muted sm:text-sm">点击添加内容，右侧会显示保存后的预览。</span>
            <span className="ui-button-primary mt-4 sm:mt-5"><Plus className="size-4" />添加第一个内容</span>
          </span>
        </button>
      ) : (
        <div className="divide-y divide-[var(--ui-line)]">
          {orderedLinks.map((link, index) => {
            const expanded = expandedId === link.id;
            const draft = drafts[link.id] || draftFromLink(link);
            const busy = busyLinkId === link.id;
            const changed = hasChanges(link, draft);

            return (
              <article key={link.id} className="bg-[var(--ui-surface)]">
                <div className="flex min-h-[56px] items-center gap-1 px-2 py-2 sm:min-h-16 sm:gap-3 sm:px-5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--ui-brand-soft)] text-[var(--ui-brand-hover)] sm:size-9">{renderLinkIcon(link, index)}</span>
                  <button type="button" onClick={() => setExpandedId(expanded ? "" : link.id)} className="min-w-0 flex-1 text-left px-1">
                    <p className="truncate text-sm font-black">{link.title || componentTypeBadge(link.type || "link")}</p>
                    <p className="mt-0.5 truncate text-[11px] ui-muted sm:text-xs">{link.url || componentTypeBadge(link.type || "link")}</p>
                  </button>
                  <span className={`hidden rounded-full px-2 py-0.5 text-[10px] font-black sm:inline-flex ${link.is_active ? "bg-[var(--ui-success-soft)] text-[var(--ui-success)]" : "bg-[var(--ui-surface-muted)] text-[var(--ui-muted)]"}`}>{link.is_active ? "已公开" : "已隐藏"}</span>
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <button type="button" onClick={() => void onMove(link.id, "up")} disabled={index === 0 || busy} className="grid size-[36px] place-items-center rounded-lg border border-[var(--ui-line)] bg-white text-[var(--ui-muted)] disabled:opacity-30 sm:size-9" title="上移"><ChevronUp className="size-4" /></button>
                    <button type="button" onClick={() => void onMove(link.id, "down")} disabled={index === orderedLinks.length - 1 || busy} className="grid size-[36px] place-items-center rounded-lg border border-[var(--ui-line)] bg-white text-[var(--ui-muted)] disabled:opacity-30 sm:size-9" title="下移"><ChevronDown className="size-4" /></button>
                    <button type="button" onClick={() => void onToggle(link)} disabled={busy} className={`grid size-[36px] place-items-center rounded-lg border ${link.is_active ? "border-[var(--ui-brand)] bg-[var(--ui-brand)] text-white" : "border-[var(--ui-line)] bg-white text-[var(--ui-muted)]"} sm:size-9`} title={link.is_active ? "点击隐藏" : "点击公开"}>
                      {busy ? <Loader2 className="size-4 animate-spin" /> : link.is_active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </button>
                    <button type="button" onClick={() => setExpandedId(expanded ? "" : link.id)} className="grid size-[36px] place-items-center rounded-lg border border-[var(--ui-line)] bg-white text-[var(--ui-muted)] sm:size-9" title="编辑"><Pencil className="size-4" /></button>
                  </div>
                </div>

                  {expanded ? (
                    <div className="border-t border-[var(--ui-line)] bg-[var(--ui-page)] p-3 sm:p-5">
                      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
                        <label className="grid gap-2 lg:col-span-2">
                          <span className="text-[11px] font-black ui-muted sm:text-xs">模块类型</span>
                          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 lg:grid-cols-4">
                            {COMPONENT_TYPE_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  if (!opt.free && !isPaid) {
                                    onUpgrade();
                                    return;
                                  }
                                  handleComponentTypeChange(draft, (patch) => updateDraft(link.id, patch), opt.value);
                                }}
                                className={`inline-flex min-h-9 items-center justify-center gap-1 truncate rounded-lg border px-2 text-[11px] font-black transition sm:gap-1.5 sm:rounded-xl sm:px-2.5 sm:py-1.5 sm:text-xs ${(draft.componentType || "link") === opt.value ? "border-[var(--ui-brand)] bg-[var(--ui-brand-soft)] text-[var(--ui-brand-hover)]" : "border-[var(--ui-line)] bg-white text-[var(--ui-muted)] hover:border-[var(--ui-brand)]/50"} ${!opt.free && !isPaid ? "opacity-60" : ""}`}
                              >
                                <span className="truncate">{opt.label}</span>
                                {!opt.free ? <span className="text-[9px] text-[var(--ui-brand)]">Pro</span> : null}
                              </button>
                            ))}
                          </div>
                        </label>

                        <DynamicFields draft={draft} onChange={(patch) => updateDraft(link.id, patch)} products={products} productsLoading={productsLoading} productsError={productsError} />
                      </div>

                      <div className="mt-4 grid gap-2 border-t border-[var(--ui-line)] pt-3 sm:mt-5 sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-2 sm:pt-4">
                        <button type="button" onClick={() => onCopy(link.url)} className="ui-button-secondary w-full sm:w-auto"><Copy className="size-4" />复制链接</button>
                        <button type="button" onClick={() => void onDelete(link)} disabled={busy} className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[var(--ui-danger)]/20 bg-[var(--ui-danger-soft)] px-3 text-sm font-black text-[var(--ui-danger)] sm:w-auto sm:min-h-11 sm:px-4"><Trash2 className="size-4" />删除</button>
                        <button type="button" onClick={() => void onUpdate(link, draft)} disabled={busy || !changed || !isDraftValid(draft)} className="ui-button-primary w-full disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto">
                          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                          {busy ? "保存中…" : changed ? "保存修改" : "已保存"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <AddModuleDrawer
        open={addModuleOpen}
        onClose={() => setAddModuleOpen(false)}
        onSelect={handleModuleSelect}
        onUpgrade={onUpgrade}
      />
    </div>
  );
}
