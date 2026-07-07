"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Power,
  PowerOff,
  X,
  FileText,
  Building2,
  Package,
  HelpCircle,
  Palette,
  Users,
  ListChecks,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";

type KnowledgeDoc = {
  id: string;
  title: string;
  category: string | null;
  categoryLabel: string;
  content: string;
  sourceType: string;
  isActive: boolean;
  allowAiCitation: boolean;
  createdAt: string;
  updatedAt: string;
};

type KnowledgeClientProps = {
  initialDocs: KnowledgeDoc[];
  aiEnabled: boolean;
};

const CATEGORY_OPTIONS = [
  { value: "company", label: "公司资料", icon: Building2, tone: "bg-[#DDE8CD] text-[#3F5F31]" },
  { value: "product", label: "产品资料", icon: Package, tone: "bg-[#EAF3FF] text-[#2563EB]" },
  { value: "faq", label: "FAQ", icon: HelpCircle, tone: "bg-[#F6E7C8] text-[#8C612E]" },
  { value: "brand_voice", label: "品牌语气", icon: Palette, tone: "bg-[#FFE6E2] text-[#B42318]" },
  { value: "customer_profile", label: "客户画像", icon: Users, tone: "bg-[#E8E6FF] text-[#5B6FFF]" },
  { value: "sop", label: "SOP", icon: ListChecks, tone: "bg-[#D1FADF] text-[#0A8E4A]" },
  { value: "document", label: "文档资料", icon: FileText, tone: "bg-[#F5F0E6] text-[#2B241E]" },
];

function getCategoryIcon(category: string | null) {
  const found = CATEGORY_OPTIONS.find((c) => c.value === category);
  return found || CATEGORY_OPTIONS[6];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "昨天";
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

export default function KnowledgeClient({ initialDocs, aiEnabled }: KnowledgeClientProps) {
  const [docs, setDocs] = useState<KnowledgeDoc[]>(initialDocs);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [editingDoc, setEditingDoc] = useState<KnowledgeDoc | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<KnowledgeDoc | null>(null);

  // 编辑器状态
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("document");
  const [formContent, setFormContent] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formAllowAiCitation, setFormAllowAiCitation] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const filteredDocs = useMemo(() => {
    return docs.filter((doc) => {
      if (categoryFilter !== "all" && doc.category !== categoryFilter) return false;
      if (activeFilter === "active" && !doc.isActive) return false;
      if (activeFilter === "inactive" && doc.isActive) return false;
      if (search) {
        const lower = search.toLowerCase();
        if (!doc.title.toLowerCase().includes(lower) && !doc.content.toLowerCase().includes(lower)) return false;
      }
      return true;
    });
  }, [docs, categoryFilter, activeFilter, search]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    docs.forEach((doc) => {
      const cat = doc.category || "document";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [docs]);

  function openNewEditor() {
    setEditingDoc(null);
    setFormTitle("");
    setFormCategory("document");
    setFormContent("");
    setFormIsActive(true);
    setFormAllowAiCitation(true);
    setIsEditorOpen(true);
    setError(null);
  }

  function openEditEditor(doc: KnowledgeDoc) {
    setEditingDoc(doc);
    setFormTitle(doc.title);
    setFormCategory(doc.category || "document");
    setFormContent(doc.content);
    setFormIsActive(doc.isActive);
    setFormAllowAiCitation(doc.allowAiCitation);
    setIsEditorOpen(true);
    setError(null);
  }

  async function handleSave() {
    if (!formTitle.trim()) {
      setError("标题不能为空");
      return;
    }
    if (!formContent.trim()) {
      setError("内容不能为空");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const url = editingDoc
        ? `/api/workbench/knowledge/${editingDoc.id}`
        : "/api/workbench/knowledge";
      const method = editingDoc ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          content: formContent,
          category: formCategory,
          isActive: formIsActive,
          allowAiCitation: formAllowAiCitation,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "保存失败");
        return;
      }

      const savedDoc = data.doc;
      if (editingDoc) {
        setDocs((prev) => prev.map((d) => (d.id === savedDoc.id ? savedDoc : d)));
      } else {
        setDocs((prev) => [savedDoc, ...prev]);
      }
      setIsEditorOpen(false);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(doc: KnowledgeDoc) {
    try {
      const res = await fetch(`/api/workbench/knowledge/${doc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !doc.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setDocs((prev) => prev.map((d) => (d.id === doc.id ? data.doc : d)));
      }
    } catch {
      setError("操作失败");
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(`/api/workbench/knowledge/${deleteConfirm.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setDocs((prev) => prev.filter((d) => d.id !== deleteConfirm.id));
        setDeleteConfirm(null);
      } else {
        setError(data.error || "删除失败");
      }
    } catch {
      setError("网络错误");
    }
  }

  async function handleRefresh() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/workbench/knowledge", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setDocs(data.docs);
      }
    } catch {
      setError("刷新失败");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-4">
      {/* 顶部操作栏 */}
      <div className="flex flex-wrap items-center gap-3 rounded-[28px] border border-[#E8DCCB] bg-white p-4 shadow-sm">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#7A6D5E]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索标题或内容..."
            className="min-h-10 w-full rounded-full border border-[#E8DCCB] bg-[#F7F1E7] py-2 pl-10 pr-4 text-sm font-bold text-[#2B241E] outline-none focus:border-[#6F8F4E] focus:bg-white"
          />
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading}
          className="grid size-10 shrink-0 place-items-center rounded-full border border-[#E8DCCB] bg-white text-[#7A6D5E] transition hover:bg-[#F7F1E7]"
          aria-label="刷新"
        >
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        </button>
        <button
          type="button"
          onClick={openNewEditor}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-[#6F8F4E] px-4 text-sm font-black text-white transition hover:bg-[#5A7A40]"
        >
          <Plus className="size-4" />
          新建资料
        </button>
      </div>

      {/* 分类筛选 */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryFilter("all")}
          className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
            categoryFilter === "all"
              ? "bg-[#2B241E] text-white"
              : "bg-white text-[#7A6D5E] border border-[#E8DCCB] hover:bg-[#F7F1E7]"
          }`}
        >
          全部 ({docs.length})
        </button>
        {CATEGORY_OPTIONS.map((opt) => {
          const count = categoryCounts[opt.value] || 0;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setCategoryFilter(opt.value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black transition ${
                categoryFilter === opt.value
                  ? "bg-[#2B241E] text-white"
                  : "bg-white text-[#7A6D5E] border border-[#E8DCCB] hover:bg-[#F7F1E7]"
              }`}
            >
              <Icon className="size-3.5" />
              {opt.label} ({count})
            </button>
          );
        })}
      </div>

      {/* 状态筛选 */}
      <div className="flex flex-wrap gap-2">
        {(["all", "active", "inactive"] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setActiveFilter(status)}
            className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
              activeFilter === status
                ? "bg-[#6F8F4E] text-white"
                : "bg-[#F7F1E7] text-[#7A6D5E] hover:bg-[#EDE4D3]"
            }`}
          >
            {status === "all" ? "全部状态" : status === "active" ? "已启用" : "已停用"}
          </button>
        ))}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-[#FFE6E2] bg-[#FFF5F3] p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#B42318]" />
          <div className="flex-1">
            <p className="text-sm font-black text-[#B42318]">操作失败</p>
            <p className="mt-1 text-xs text-[#7A6D5E]">{error}</p>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-[#7A6D5E] hover:text-[#2B241E]">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* 资料列表 */}
      {filteredDocs.length === 0 ? (
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-10 text-center">
          <FileText className="mx-auto mb-4 size-12 text-[#E8DCCB]" />
          <p className="text-lg font-black text-[#2B241E]">暂无资料</p>
          <p className="mt-2 text-sm text-[#7A6D5E]">
            {docs.length === 0
              ? "还没有任何资料，点击「新建资料」添加第一条。"
              : "没有符合筛选条件的资料，试试调整筛选。"}
          </p>
          {docs.length === 0 && (
            <button
              type="button"
              onClick={openNewEditor}
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-[#6F8F4E] px-4 text-sm font-black text-white hover:bg-[#5A7A40]"
            >
              <Plus className="size-4" />
              新建第一条资料
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocs.map((doc) => {
            const catInfo = getCategoryIcon(doc.category);
            const CatIcon = catInfo.icon;
            return (
              <div
                key={doc.id}
                className={`flex flex-col rounded-[24px] border border-[#E8DCCB] bg-white p-4 shadow-sm transition hover:shadow-md ${
                  !doc.isActive ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${catInfo.tone}`}>
                    <CatIcon className="size-4.5" />
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                      doc.isActive
                        ? "bg-[#DDE8CD] text-[#3F5F31]"
                        : "bg-[#F7F1E7] text-[#7A6D5E]"
                    }`}
                  >
                    {doc.isActive ? "已启用" : "已停用"}
                  </span>
                </div>

                <h3 className="mt-3 truncate text-sm font-black text-[#2B241E]">{doc.title}</h3>
                <p className="mt-1 text-[10px] font-bold text-[#7A6D5E]">{doc.categoryLabel}</p>
                <p className="mt-2 line-clamp-3 text-xs text-[#7A6D5E]">{doc.content}</p>

                <div className="mt-3 flex items-center justify-between border-t border-[#E8DCCB] pt-3">
                  <span className="text-[10px] text-[#7A6D5E]">更新于 {formatDate(doc.updatedAt)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(doc)}
                      className={`grid size-8 place-items-center rounded-lg transition ${
                        doc.isActive
                          ? "text-[#8C612E] hover:bg-[#F6E7C8]"
                          : "text-[#6F8F4E] hover:bg-[#DDE8CD]"
                      }`}
                      title={doc.isActive ? "停用" : "启用"}
                    >
                      {doc.isActive ? <PowerOff className="size-4" /> : <Power className="size-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditEditor(doc)}
                      className="grid size-8 place-items-center rounded-lg text-[#2563EB] transition hover:bg-[#EAF3FF]"
                      title="编辑"
                    >
                      <Edit3 className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(doc)}
                      className="grid size-8 place-items-center rounded-lg text-[#B42318] transition hover:bg-[#FFE6E2]"
                      title="删除"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI 引用说明 */}
      <div className="rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8] p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#8C612E]" />
          <div>
            <p className="text-sm font-black text-[#8C612E]">关于 AI 引用</p>
            <p className="mt-1 text-xs text-[#7A6D5E]">
              启用「允许 AI 引用」的资料，将作为 AI 助手回答问题时的参考上下文。停用的资料不会被 AI 使用。
              {aiEnabled
                ? "当前 AI 客服已开启，资料会自动用于访客接待。"
                : "当前 AI 客服未开启，资料暂不会被使用。"}
            </p>
          </div>
        </div>
      </div>

      {/* 编辑器抽屉 */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/35 sm:items-center sm:justify-center" onClick={() => !isSaving && setIsEditorOpen(false)} role="presentation">
          <div
            className="flex max-h-[90vh] w-full flex-col rounded-t-[28px] bg-white shadow-xl sm:max-h-[85vh] sm:w-[640px] sm:rounded-[28px]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={editingDoc ? "编辑资料" : "新建资料"}
          >
            <div className="flex items-center justify-between border-b border-[#E8DCCB] p-5">
              <h2 className="text-lg font-black text-[#2B241E]">{editingDoc ? "编辑资料" : "新建资料"}</h2>
              <button
                type="button"
                onClick={() => !isSaving && setIsEditorOpen(false)}
                className="grid size-9 place-items-center rounded-xl bg-[#F7F1E7] text-[#7A6D5E] hover:text-[#2B241E]"
                aria-label="关闭"
                disabled={isSaving}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-black text-[#3F5F31]">标题 *</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="例如：公司简介、产品 FAQ、品牌语气规范..."
                    className="min-h-10 w-full rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] px-4 py-2 text-sm font-bold text-[#2B241E] outline-none focus:border-[#6F8F4E] focus:bg-white"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-black text-[#3F5F31]">资料类型 *</label>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {CATEGORY_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const selected = formCategory === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFormCategory(opt.value)}
                          className={`flex flex-col items-center gap-1 rounded-2xl border p-2 text-center transition ${
                            selected
                              ? "border-[#6F8F4E] bg-[#DDE8CD]"
                              : "border-[#E8DCCB] bg-white hover:bg-[#F7F1E7]"
                          }`}
                        >
                          <span className={`grid size-8 place-items-center rounded-xl ${opt.tone}`}>
                            <Icon className="size-4" />
                          </span>
                          <span className={`text-[10px] font-black ${selected ? "text-[#3F5F31]" : "text-[#7A6D5E]"}`}>
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-black text-[#3F5F31]">内容 *</label>
                  <textarea
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="输入资料内容..."
                    rows={8}
                    className="w-full rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] px-4 py-3 text-sm text-[#2B241E] outline-none focus:border-[#6F8F4E] focus:bg-white"
                    maxLength={10000}
                  />
                  <p className="mt-1 text-right text-[10px] text-[#7A6D5E]">{formContent.length} / 10000</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <label className={`flex items-center gap-3 rounded-2xl border p-3 cursor-pointer transition ${
                    formIsActive ? "border-[#6F8F4E] bg-[#DDE8CD]" : "border-[#E8DCCB] bg-[#F7F1E7]"
                  }`}>
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="size-4 accent-[#6F8F4E]"
                    />
                    <div>
                      <p className="text-xs font-black text-[#2B241E]">启用此资料</p>
                      <p className="text-[10px] text-[#7A6D5E]">停用后 AI 不会引用</p>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 rounded-2xl border p-3 cursor-pointer transition ${
                    formAllowAiCitation ? "border-[#6F8F4E] bg-[#DDE8CD]" : "border-[#E8DCCB] bg-[#F7F1E7]"
                  }`}>
                    <input
                      type="checkbox"
                      checked={formAllowAiCitation}
                      onChange={(e) => setFormAllowAiCitation(e.target.checked)}
                      className="size-4 accent-[#6F8F4E]"
                    />
                    <div>
                      <p className="text-xs font-black text-[#2B241E]">允许 AI 引用</p>
                      <p className="text-[10px] text-[#7A6D5E]">AI 可在回复中引用</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#E8DCCB] p-5">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="min-h-10 rounded-full bg-[#F7F1E7] px-5 text-sm font-black text-[#7A6D5E] hover:bg-[#EDE4D3]"
                disabled={isSaving}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#6F8F4E] px-5 text-sm font-black text-white hover:bg-[#5A7A40] disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
                {editingDoc ? "保存修改" : "创建资料"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4" onClick={() => setDeleteConfirm(null)} role="presentation">
          <div
            className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="确认删除"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-[#FFE6E2] text-[#B42318]">
                <Trash2 className="size-5" />
              </span>
              <div>
                <p className="text-sm font-black text-[#2B241E]">确认删除</p>
                <p className="text-xs text-[#7A6D5E]">删除后无法恢复</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-[#7A6D5E]">
              确定要删除「<span className="font-bold text-[#2B241E]">{deleteConfirm.title}</span>」吗？
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="min-h-10 rounded-full bg-[#F7F1E7] px-4 text-sm font-black text-[#7A6D5E]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="min-h-10 rounded-full bg-[#B42318] px-4 text-sm font-black text-white hover:bg-[#8C1A14]"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
