"use client";

import { useState, useEffect, useCallback } from "react";
import WorkbenchShell from "@/components/workbench/WorkbenchShell";
import { Plus, FileText, Upload, Loader, CheckCircle, XCircle } from "lucide-react";

type KnowledgeDoc = {
  id: string;
  title: string;
  category: string | null;
  source_type: string;
  is_active: boolean;
  allow_ai_citation: boolean;
  created_at: string;
  updated_at: string;
};

export default function WorkbenchEnterprisePage() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({ title: "", category: "", content: "" });

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/knowledge");
      const data = await res.json();
      if (data.success) setDocs(data.docs ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/dashboard/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title.trim(), category: form.category.trim() || null, content: form.content.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setDocs((prev) => [data.doc, ...prev]);
        setForm({ title: "", category: "", content: "" });
        setShowForm(false);
        setSaveMsg({ ok: true, text: "新增成功！" });
      } else {
        setSaveMsg({ ok: false, text: data.error || "新增失败。" });
      }
    } catch {
      setSaveMsg({ ok: false, text: "网络错误，请稍后重试。" });
    } finally {
      setSaving(false);
    }
  }

  const categories = [...new Set(docs.map((d) => d.category).filter(Boolean))] as string[];
  const activeCount = docs.filter((d) => d.is_active).length;
  const thisMonthCount = docs.filter((d) => {
    const dDate = new Date(d.created_at);
    const now = new Date();
    return dDate.getMonth() === now.getMonth() && dDate.getFullYear() === now.getFullYear();
  }).length;

  const sourceTypeLabels: Record<string, string> = {
    manual: "手动录入",
    web: "网页抓取",
    document: "文档上传",
    api: "API 接入",
  };

  if (loading) {
    return (
      <WorkbenchShell eyebrow="Enterprise Knowledge" title="企业资料库" subtitle="上传文档、FAQ 与产品资料，作为 AI 客服回答客户咨询的知识底座。">
        <div className="flex items-center justify-center py-20">
          <Loader className="size-6 animate-spin text-[#6F8F4E]" />
        </div>
      </WorkbenchShell>
    );
  }

  return (
    <WorkbenchShell eyebrow="Enterprise Knowledge" title="企业资料库" subtitle="上传文档、FAQ 与产品资料，作为 AI 客服回答客户咨询的知识底座。">
      {/* 统计 */}
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "资料总数", value: docs.length, tone: "bg-[#DDE8CD] text-[#3F5F31]" },
          { label: "分类", value: categories.length, tone: "bg-[#EAF3FF] text-[#2563EB]" },
          { label: "本月更新", value: thisMonthCount, tone: "bg-[#F6E7C8] text-[#8C612E]" },
        ].map((item) => (
          <div key={item.label} className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-[#7A6D5E]">{item.label}</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-[#2B241E]">{item.value}</p>
          </div>
        ))}
      </section>

      {/* 新增表单 */}
      {showForm && (
        <section className="mt-6 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-black text-[#3F5F31]">新增资料条目</p>
          <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="font-black text-[#2B241E]">标题 *</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  maxLength={100}
                  required
                  placeholder="例如：公司介绍、常见问题、产品手册"
                  className="rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-black text-[#2B241E]">分类</span>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  maxLength={30}
                  placeholder="例如：公司介绍、产品资料、FAQ"
                  list="category-suggestions"
                  className="rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none"
                />
                <datalist id="category-suggestions">
                  {categories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </label>
            </div>
            <label className="grid gap-1.5 text-sm">
              <span className="font-black text-[#2B241E]">内容 *</span>
              <textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={6}
                maxLength={50000}
                required
                placeholder="输入知识库内容，AI 客服会参考这些内容回答访客问题"
                className="resize-none rounded-2xl border border-[#E8DCCB] bg-white px-4 py-3 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none"
              />
            </label>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#6F8F4E] px-5 text-sm font-black text-white hover:bg-[#5E7F3F] disabled:opacity-50"
              >
                {saving ? <><Loader className="size-4 animate-spin" />保存中...</> : "保存条目"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setSaveMsg(null); }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#F7F1E7] px-5 text-sm font-black text-[#3F5F31] hover:bg-[#EDE3D5]"
              >
                取消
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
      )}

      {/* 资料列表 */}
      <section className="mt-6 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-[#3F5F31]">资料列表</p>
            <p className="mt-1 text-xs text-[#7A6D5E]">上传的文档仅用于 AI 客服训练，不会在主页公开。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowForm(!showForm)}
              className="link168-button-press inline-flex min-h-10 items-center gap-2 rounded-full bg-[#6F8F4E] px-4 text-xs font-black text-white"
            >
              <Plus aria-hidden className="size-4" /> 新增条目
            </button>
          </div>
        </div>

        {docs.length === 0 ? (
          <p className="mt-6 text-center text-sm text-[#7A6D5E]">还没有资料，先新增一个 FAQ 或录入产品介绍。</p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {docs.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center gap-3 rounded-[24px] border border-[#E8DCCB] bg-[#F7F1E7] p-4"
              >
                <span className="grid size-11 place-items-center rounded-2xl bg-white text-[#3F5F31] ring-1 ring-[#E8DCCB]">
                  <FileText aria-hidden className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-[#2B241E]">{doc.title}</p>
                  <p className="truncate text-xs text-[#7A6D5E]">
                    {doc.category ?? "未分类"} · {sourceTypeLabels[doc.source_type] ?? doc.source_type} ·{" "}
                    {new Date(doc.updated_at).toLocaleDateString("zh-CN")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1.5 text-xs font-black ${doc.is_active ? "bg-[#DDE8CD] text-[#3F5F31]" : "bg-[#F7F1E7] text-[#7A6D5E]"}`}>
                    {doc.is_active ? "可用于 AI" : "已下线"}
                  </span>
                  {doc.allow_ai_citation && (
                    <span className="rounded-full bg-[#EAF3FF] px-3 py-1.5 text-xs font-black text-[#2563EB]">AI 引用</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </WorkbenchShell>
  );
}
