"use client";

import Link from "next/link";
import { useState } from "react";

import type {
  CurrentPageDraftDocument,
  CurrentPageDraftSnapshot,
  CurrentPageStatus,
} from "@/lib/current/contracts";
import { CurrentPageStatusBadge } from "@/components/current-page/states";

type EditorProps = {
  pageId: string;
  initialDraft: CurrentPageDraftSnapshot;
  initialStatus: CurrentPageStatus;
};

const inputClass =
  "mt-2 min-h-11 w-full rounded-[14px] border border-[#DDD6CC] bg-white px-3 text-sm text-[#151515] outline-none transition focus:border-[#0B4DD8] focus:ring-2 focus:ring-[#C9D5F6]";

function withDocument(
  document: CurrentPageDraftDocument,
  patch: Partial<CurrentPageDraftDocument>,
): CurrentPageDraftDocument {
  return { ...document, ...patch };
}

export function CurrentPageEditor({ pageId, initialDraft, initialStatus }: EditorProps) {
  const [draft, setDraft] = useState(initialDraft);
  const [status, setStatus] = useState<CurrentPageStatus>(initialStatus);
  const [busy, setBusy] = useState<"saving" | "publishing" | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const document = draft.document;

  const updateProfile = (field: keyof CurrentPageDraftDocument["profile"], value: string) => {
    setDraft((current) => ({
      ...current,
      document: withDocument(current.document, {
        profile: { ...current.document.profile, [field]: value || null },
      }),
    }));
    setFeedback(null);
  };

  const updateSection = (value: string) => {
    const current = document.sections[0];
    const section = current
      ? { ...current, body: value || null }
      : { id: crypto.randomUUID(), kind: "text", title: "介绍", body: value || null, visible: true, items: [] };
    setDraft((state) => ({
      ...state,
      document: withDocument(state.document, { sections: [section, ...state.document.sections.slice(1)] }),
    }));
    setFeedback(null);
  };

  const updateOffering = (field: "name" | "summary" | "priceText", value: string) => {
    const current = document.offerings[0];
    const offering = current
      ? { ...current, [field]: value || null }
      : {
          id: crypto.randomUUID(),
          name: field === "name" ? value : "",
          summary: field === "summary" ? value : null,
          priceText: field === "priceText" ? value : null,
          visible: true,
          responsibleMemberIds: [],
        };
    setDraft((state) => ({
      ...state,
      document: withDocument(state.document, { offerings: [offering, ...state.document.offerings.slice(1)] }),
    }));
    setFeedback(null);
  };

  async function saveDraft() {
    setBusy("saving");
    setFeedback(null);
    try {
      const response = await fetch(`/api/current/pages/${pageId}/draft`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ document }),
      });
      const payload = (await response.json()) as { success?: boolean; draft?: CurrentPageDraftSnapshot; error?: string };
      if (!response.ok || !payload.success || !payload.draft) {
        throw new Error(payload.error || "Draft 保存失败，请保留当前内容后重试。");
      }
      setDraft(payload.draft);
      setStatus((current) => (current === "published" ? "draft_changes" : current));
      setFeedback({ tone: "success", text: `Draft 已保存，revision ${payload.draft.revision}。` });
    } catch (error) {
      setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Draft 保存失败。" });
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    setBusy("publishing");
    setStatus("publishing");
    setFeedback(null);
    try {
      const response = await fetch(`/api/current/pages/${pageId}/publish`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-idempotency-key": crypto.randomUUID() },
        body: "{}",
      });
      const payload = (await response.json()) as { success?: boolean; publication?: { status: CurrentPageStatus }; error?: string };
      if (!response.ok || !payload.success || !payload.publication) {
        throw new Error(payload.error || "Publish 失败；Draft 与旧 Published 版本已保留。");
      }
      setStatus(payload.publication.status);
      setFeedback({ tone: "success", text: "Publish 成功，公开页面现在消费新的 Published boundary。" });
    } catch (error) {
      setStatus("publish_failed");
      setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Publish 失败；Draft 与旧 Published 版本已保留。" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-[24px] border border-[#DDD6CC] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0B4DD8]">CURRENT Draft editor</p>
            <h2 className="mt-1 text-xl font-bold text-[#151515]">编辑个人页面</h2>
          </div>
          <CurrentPageStatusBadge status={status} />
        </div>

        <div className="mt-6 grid gap-5">
          <label className="text-sm font-bold text-[#151515]">
            公开展示名称
            <input className={inputClass} value={document.profile.displayName} onChange={(event) => updateProfile("displayName", event.target.value)} />
          </label>
          <label className="text-sm font-bold text-[#151515]">
            一句话定位
            <input className={inputClass} value={document.profile.headline || ""} onChange={(event) => updateProfile("headline", event.target.value)} />
          </label>
          <label className="text-sm font-bold text-[#151515]">
            页面介绍
            <textarea className={`${inputClass} min-h-32 py-3`} value={document.profile.bio || ""} onChange={(event) => updateProfile("bio", event.target.value)} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold text-[#151515]">公司<input className={inputClass} value={document.profile.company || ""} onChange={(event) => updateProfile("company", event.target.value)} /></label>
            <label className="text-sm font-bold text-[#151515]">职位<input className={inputClass} value={document.profile.jobTitle || ""} onChange={(event) => updateProfile("jobTitle", event.target.value)} /></label>
          </div>
          <label className="text-sm font-bold text-[#151515]">内容块<textarea className={`${inputClass} min-h-28 py-3`} value={document.sections[0]?.body || ""} onChange={(event) => updateSection(event.target.value)} placeholder="填写一段公开介绍，或在下方填写服务。" /></label>
          <div className="rounded-[18px] border border-[#EEE7DD] bg-[#FBF8F2] p-4">
            <p className="text-sm font-bold text-[#151515]">服务 Offering（可选）</p>
            <div className="mt-3 grid gap-3">
              <input className={inputClass.replace("mt-2 ", "")} value={document.offerings[0]?.name || ""} onChange={(event) => updateOffering("name", event.target.value)} placeholder="服务名称" />
              <input className={inputClass.replace("mt-2 ", "")} value={document.offerings[0]?.summary || ""} onChange={(event) => updateOffering("summary", event.target.value)} placeholder="服务说明" />
              <input className={inputClass.replace("mt-2 ", "")} value={document.offerings[0]?.priceText || ""} onChange={(event) => updateOffering("priceText", event.target.value)} placeholder="价格说明（可选）" />
            </div>
          </div>
        </div>

        {feedback ? <div role={feedback.tone === "error" ? "alert" : "status"} className={`mt-5 rounded-[14px] border px-4 py-3 text-sm ${feedback.tone === "error" ? "border-[#F2C2BE] bg-[#FDECEA] text-[#B42318]" : "border-[#B6DEC7] bg-[#EDF8F2] text-[#126442]"}`}>{feedback.text}</div> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" disabled={Boolean(busy)} onClick={saveDraft} className="inline-flex min-h-11 items-center justify-center rounded-[14px] bg-[#0B4DD8] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{busy === "saving" ? "保存中…" : "保存 Draft"}</button>
          <button type="button" disabled={Boolean(busy)} onClick={publish} className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-[#0B4DD8] bg-white px-4 text-sm font-bold text-[#0B4DD8] disabled:cursor-not-allowed disabled:opacity-60">{busy === "publishing" ? "Publish 中…" : "Publish"}</button>
          <Link href={`/console/pages/${pageId}/preview`} className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-[#DDD6CC] px-4 text-sm font-bold text-[#151515]">预览 Draft</Link>
        </div>
      </div>

      <aside className="rounded-[24px] border border-[#DDD6CC] bg-[#FFFDF9] p-5 shadow-sm">
        <p className="text-sm font-bold text-[#151515]">边界说明</p>
        <ul className="mt-3 space-y-3 text-sm leading-6 text-[#5E5A54]">
          <li>编辑器保存的是 CURRENT `CurrentPageDraft`。</li>
          <li>Preview 只读取 Draft，不会改动 Published pointer。</li>
          <li>Publish 失败时，Draft 与旧 Published 版本由 repository 保留。</li>
        </ul>
      </aside>
    </section>
  );
}
