"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import type { DashboardLink, LinkDraft } from "@/components/dashboard-v1/types";
import { emptyLinkDraft, isValidHttpUrl } from "@/components/dashboard-v1/types";

function draftFromLink(link: DashboardLink): LinkDraft {
  return {
    title: link.title,
    url: link.url,
    description: link.description || "",
    iconType: link.icon_type || "default",
    iconValue: link.icon_value || "",
  };
}

function planLimit(planCode: string) {
  return planCode === "free" ? 10 : null;
}

export function LinksPanel({
  links,
  planCode,
  creating,
  busyLinkId,
  onCreate,
  onUpdate,
  onToggle,
  onDelete,
  onMove,
  onCopy,
}: {
  links: DashboardLink[];
  planCode: string;
  creating: boolean;
  busyLinkId: string;
  onCreate: (draft: LinkDraft) => Promise<boolean>;
  onUpdate: (link: DashboardLink, draft: LinkDraft) => Promise<boolean>;
  onToggle: (link: DashboardLink) => Promise<void>;
  onDelete: (link: DashboardLink) => Promise<void>;
  onMove: (linkId: string, direction: "up" | "down") => Promise<void>;
  onCopy: (value: string) => void;
}) {
  const [newOpen, setNewOpen] = useState(false);
  const [newDraft, setNewDraft] = useState<LinkDraft>(emptyLinkDraft);
  const [expandedId, setExpandedId] = useState<string>("");
  const [drafts, setDrafts] = useState<Record<string, LinkDraft>>({});
  const limit = planLimit(planCode);
  const limitReached = limit !== null && links.length >= limit;

  useEffect(() => {
    setDrafts((current) => {
      const next: Record<string, LinkDraft> = {};
      for (const link of links) next[link.id] = current[link.id] || draftFromLink(link);
      return next;
    });
  }, [links]);

  const orderedLinks = useMemo(() => [...links].sort((a, b) => a.position - b.position), [links]);

  async function createLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newDraft.title.trim() || !isValidHttpUrl(newDraft.url)) return;
    const ok = await onCreate(newDraft);
    if (ok) {
      setNewDraft(emptyLinkDraft);
      setNewOpen(false);
    }
  }

  function updateDraft(id: string, patch: Partial<LinkDraft>) {
    setDrafts((current) => ({ ...current, [id]: { ...(current[id] || emptyLinkDraft), ...patch } }));
  }

  return (
    <div className="grid gap-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="ui-eyebrow">我的链接</p>
          <h1 className="mt-1 text-2xl ui-title sm:text-3xl">管理公开入口</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 ui-muted">链接不会被改写成短链。显示、隐藏、排序和编辑都会真实写入数据库。</p>
        </div>
        <button type="button" disabled={limitReached} onClick={() => setNewOpen(true)} className="ui-button-primary disabled:cursor-not-allowed disabled:opacity-50">
          <Plus className="size-4" />新增链接
        </button>
      </header>

      {limit !== null ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--ui-line)] bg-[var(--ui-surface)] px-4 py-3 text-sm">
          <span className="font-bold text-[var(--ui-muted)]">免费版链接额度</span>
          <span className={`font-black ${limitReached ? "text-[var(--ui-danger)]" : "text-[var(--ui-brand-hover)]"}`}>{links.length}/{limit}</span>
        </div>
      ) : null}

      {newOpen ? (
        <form onSubmit={createLink} className="ui-surface p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div><p className="ui-eyebrow">新增链接</p><h2 className="mt-1 text-xl ui-title">填写真实网址</h2></div>
            <button type="button" onClick={() => setNewOpen(false)} className="grid size-9 place-items-center rounded-xl bg-[var(--ui-surface-muted)]" aria-label="关闭"><X className="size-4" /></button>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2"><span className="text-sm font-black">标题</span><input value={newDraft.title} onChange={(event) => setNewDraft((current) => ({ ...current, title: event.target.value }))} maxLength={60} placeholder="例如：我的官方网站" className="ui-input" /></label>
            <label className="grid gap-2"><span className="text-sm font-black">完整网址</span><input value={newDraft.url} onChange={(event) => setNewDraft((current) => ({ ...current, url: event.target.value }))} placeholder="https://example.com" className={`ui-input ${newDraft.url && !isValidHttpUrl(newDraft.url) ? "!border-[var(--ui-danger)]" : ""}`} /><span className={`text-xs ${newDraft.url && !isValidHttpUrl(newDraft.url) ? "text-[var(--ui-danger)]" : "ui-muted"}`}>{newDraft.url && !isValidHttpUrl(newDraft.url) ? "请输入带 http:// 或 https:// 的完整有效网址。" : "系统不会自动补全或改写网址。"}</span></label>
            <label className="grid gap-2 lg:col-span-2"><span className="text-sm font-black">描述（选填）</span><input value={newDraft.description} onChange={(event) => setNewDraft((current) => ({ ...current, description: event.target.value }))} maxLength={200} placeholder="一句话说明这个链接" className="ui-input" /></label>
            <label className="grid gap-2"><span className="text-sm font-black">图标</span><select value={newDraft.iconType} onChange={(event) => setNewDraft((current) => ({ ...current, iconType: event.target.value }))} className="ui-input"><option value="default">默认链接图标</option><option value="emoji">使用表情图标</option></select></label>
            {newDraft.iconType === "emoji" ? <label className="grid gap-2"><span className="text-sm font-black">表情图标</span><input value={newDraft.iconValue} onChange={(event) => setNewDraft((current) => ({ ...current, iconValue: event.target.value }))} maxLength={8} placeholder="例如：🌟" className="ui-input text-center text-xl" /></label> : <div />}
          </div>
          <div className="mt-5 flex justify-end gap-2 border-t border-[var(--ui-line)] pt-5">
            <button type="button" onClick={() => setNewOpen(false)} className="ui-button-secondary">取消</button>
            <button type="submit" disabled={creating || !newDraft.title.trim() || !isValidHttpUrl(newDraft.url)} className="ui-button-primary disabled:cursor-not-allowed disabled:opacity-50">{creating ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{creating ? "正在创建…" : "保存并公开"}</button>
          </div>
        </form>
      ) : null}

      <section className="ui-surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--ui-line)] px-5 py-4">
          <div><h2 className="font-black">链接列表</h2><p className="mt-1 text-xs ui-muted">共 {links.length} 个链接，已公开 {links.filter((link) => link.is_active).length} 个</p></div>
        </div>

        {orderedLinks.length === 0 ? (
          <button type="button" onClick={() => setNewOpen(true)} className="grid min-h-64 w-full place-items-center p-8 text-center">
            <span><span className="mx-auto grid size-12 place-items-center rounded-xl bg-[var(--ui-brand-soft)] text-[var(--ui-brand-hover)]"><Link2 className="size-6" /></span><strong className="mt-3 block">还没有链接</strong><span className="mt-1 block text-sm ui-muted">添加一个真实网址，右侧会显示保存后的预览。</span><span className="ui-button-primary mt-5"><Plus className="size-4" />添加第一个链接</span></span>
          </button>
        ) : (
          <div className="divide-y divide-[var(--ui-line)]">
            {orderedLinks.map((link, index) => {
              const expanded = expandedId === link.id;
              const draft = drafts[link.id] || draftFromLink(link);
              const busy = busyLinkId === link.id;
              const changed = draft.title !== link.title || draft.url !== link.url || draft.description !== (link.description || "") || draft.iconType !== link.icon_type || draft.iconValue !== (link.icon_value || "");
              return (
                <article key={link.id} className="bg-[var(--ui-surface)]">
                  <div className="flex min-h-16 items-center gap-2 px-3 py-3 sm:gap-3 sm:px-5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--ui-brand-soft)] text-sm font-black text-[var(--ui-brand-hover)]">{link.icon_type === "emoji" && link.icon_value ? link.icon_value : index + 1}</span>
                    <button type="button" onClick={() => setExpandedId(expanded ? "" : link.id)} className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-black">{link.title}</p>
                      <p className="mt-1 truncate text-xs ui-muted">{link.url}</p>
                    </button>
                    <span className={`hidden rounded-full px-2.5 py-1 text-[10px] font-black sm:inline-flex ${link.is_active ? "bg-[var(--ui-success-soft)] text-[var(--ui-success)]" : "bg-[var(--ui-surface-muted)] text-[var(--ui-muted)]"}`}>{link.is_active ? "已公开" : "已隐藏"}</span>
                    <button type="button" onClick={() => void onMove(link.id, "up")} disabled={index === 0 || busy} className="grid size-9 place-items-center rounded-lg border border-[var(--ui-line)] bg-white text-[var(--ui-muted)] disabled:opacity-30" title="上移"><ChevronUp className="size-4" /></button>
                    <button type="button" onClick={() => void onMove(link.id, "down")} disabled={index === orderedLinks.length - 1 || busy} className="grid size-9 place-items-center rounded-lg border border-[var(--ui-line)] bg-white text-[var(--ui-muted)] disabled:opacity-30" title="下移"><ChevronDown className="size-4" /></button>
                    <button type="button" onClick={() => void onToggle(link)} disabled={busy} className={`grid size-9 place-items-center rounded-lg border ${link.is_active ? "border-[var(--ui-brand)] bg-[var(--ui-brand)] text-white" : "border-[var(--ui-line)] bg-white text-[var(--ui-muted)]"}`} title={link.is_active ? "点击隐藏" : "点击公开"}>{busy ? <Loader2 className="size-4 animate-spin" /> : link.is_active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</button>
                    <button type="button" onClick={() => setExpandedId(expanded ? "" : link.id)} className="grid size-9 place-items-center rounded-lg border border-[var(--ui-line)] bg-white text-[var(--ui-muted)]" title="编辑"><Pencil className="size-4" /></button>
                  </div>

                  {expanded ? (
                    <div className="border-t border-[var(--ui-line)] bg-[var(--ui-page)] p-4 sm:p-5">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <label className="grid gap-2"><span className="text-xs font-black ui-muted">标题</span><input value={draft.title} onChange={(event) => updateDraft(link.id, { title: event.target.value })} maxLength={60} className="ui-input" /></label>
                        <label className="grid gap-2"><span className="text-xs font-black ui-muted">完整网址</span><input value={draft.url} onChange={(event) => updateDraft(link.id, { url: event.target.value })} className={`ui-input ${draft.url && !isValidHttpUrl(draft.url) ? "!border-[var(--ui-danger)]" : ""}`} /><span className={`text-xs ${draft.url && !isValidHttpUrl(draft.url) ? "text-[var(--ui-danger)]" : "ui-muted"}`}>{draft.url && !isValidHttpUrl(draft.url) ? "网址格式不正确。" : "保存时不会改写网址。"}</span></label>
                        <label className="grid gap-2 lg:col-span-2"><span className="text-xs font-black ui-muted">描述</span><input value={draft.description} onChange={(event) => updateDraft(link.id, { description: event.target.value })} maxLength={200} className="ui-input" /></label>
                        <label className="grid gap-2"><span className="text-xs font-black ui-muted">图标</span><select value={draft.iconType} onChange={(event) => updateDraft(link.id, { iconType: event.target.value })} className="ui-input"><option value="default">默认链接图标</option><option value="emoji">表情图标</option></select></label>
                        {draft.iconType === "emoji" ? <label className="grid gap-2"><span className="text-xs font-black ui-muted">表情</span><input value={draft.iconValue} onChange={(event) => updateDraft(link.id, { iconValue: event.target.value })} maxLength={8} className="ui-input text-center text-xl" /></label> : <div />}
                      </div>
                      <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--ui-line)] pt-4">
                        <button type="button" onClick={() => onCopy(link.url)} className="ui-button-secondary"><Copy className="size-4" />复制</button>
                        <button type="button" onClick={() => void onDelete(link)} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--ui-danger)]/20 bg-[var(--ui-danger-soft)] px-4 text-sm font-black text-[var(--ui-danger)]"><Trash2 className="size-4" />删除</button>
                        <button type="button" onClick={() => void onUpdate(link, draft)} disabled={busy || !changed || !draft.title.trim() || !isValidHttpUrl(draft.url)} className="ui-button-primary disabled:cursor-not-allowed disabled:opacity-45">{busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{busy ? "保存中…" : changed ? "保存修改" : "已保存"}</button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
