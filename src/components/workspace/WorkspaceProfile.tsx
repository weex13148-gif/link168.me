"use client";

import { useState } from "react";
import { Pencil, Check, X, Building2, Globe, Calendar } from "lucide-react";
import { roleAtLeast } from "@/lib/workspace/client-types";
import type { Workspace } from "@/lib/workspace/client-types";

interface WorkspaceProfileProps {
  workspace: Workspace;
  onUpdate: (updated: Workspace) => void;
}

export default function WorkspaceProfile({ workspace, onUpdate }: WorkspaceProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: workspace.name,
    description: workspace.description || "",
    slug: workspace.slug,
  });

  const canEdit = roleAtLeast(workspace.myRole, "admin");
  const isOwner = workspace.myRole === "owner";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setSaveError("请输入工作空间名称");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          slug: form.slug.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onUpdate({ ...workspace, ...data.workspace });
        setIsEditing(false);
      } else {
        setSaveError(data.error || "保存失败");
      }
    } catch {
      setSaveError("网络错误，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setIsEditing(false);
    setSaveError(null);
    setForm({
      name: workspace.name,
      description: workspace.description || "",
      slug: workspace.slug,
    });
  }

  return (
    <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#3F5F31]">企业资料</p>
          <p className="mt-1 text-xs text-[#7A6D5E]">管理工作空间的基本信息</p>
        </div>
        {canEdit && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F7F1E7] px-4 py-2 text-sm font-black text-[#3F5F31] hover:bg-[#EDE3D5]"
          >
            <Pencil className="size-4" />
            编辑资料
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="block text-xs font-black text-[#7A6D5E]">工作空间名称 *</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                maxLength={50}
                className="w-full rounded-xl border border-[#E8DCCB] px-3 py-2.5 text-sm text-[#2B241E] focus:border-[#6F8F4E] focus:outline-none"
              />
            </label>
            <label className="space-y-1.5">
              <span className="block text-xs font-black text-[#7A6D5E]">自定义链接后缀</span>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))}
                maxLength={32}
                placeholder="company-name"
                className="w-full rounded-xl border border-[#E8DCCB] px-3 py-2.5 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none"
              />
            </label>
          </div>
          <label className="space-y-1.5">
            <span className="block text-xs font-black text-[#7A6D5E]">描述</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              maxLength={200}
              rows={3}
              placeholder="企业简介（可选）"
              className="w-full resize-none rounded-xl border border-[#E8DCCB] px-3 py-2.5 text-sm text-[#2B241E] placeholder-[#C8B89A] focus:border-[#6F8F4E] focus:outline-none"
            />
          </label>
          {saveError && (
            <p className="text-xs text-[#B42318]">{saveError}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E8DCCB] px-4 py-2.5 text-sm font-black text-[#7A6D5E] hover:bg-[#F7F1E7]"
            >
              <X className="size-4" />
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6F8F4E] px-4 py-2.5 text-sm font-black text-white hover:bg-[#5E7F3F] disabled:opacity-50"
            >
              <Check className="size-4" />
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-[#F7F1E7] p-4">
            <span className="grid size-10 place-items-center rounded-xl bg-[#DDE8CD] text-[#3F5F31]">
              <Building2 className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-[#7A6D5E]">工作空间名称</p>
              <p className="mt-1 text-sm font-black text-[#2B241E]">{workspace.name}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl bg-[#F7F1E7] p-4">
              <span className="grid size-10 place-items-center rounded-xl bg-[#EAF3FF] text-[#2563EB]">
                <Globe className="size-5" />
              </span>
              <div>
                <p className="text-xs font-black text-[#7A6D5E]">链接后缀</p>
                <p className="mt-1 text-sm font-black text-[#2B241E]">{workspace.slug}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-[#F7F1E7] p-4">
              <span className="grid size-10 place-items-center rounded-xl bg-[#F6E7C8] text-[#8C612E]">
                <Calendar className="size-5" />
              </span>
              <div>
                <p className="text-xs font-black text-[#7A6D5E]">创建时间</p>
                <p className="mt-1 text-sm font-black text-[#2B241E]">
                  {new Date(workspace.createdAt).toLocaleDateString("zh-CN")}
                </p>
              </div>
            </div>
          </div>

          {workspace.description && (
            <div className="flex items-start gap-3 rounded-xl bg-[#F7F1E7] p-4">
              <span className="grid size-10 place-items-center rounded-xl bg-[#EDE3D5] text-[#7A6D5E]">
                <span className="text-xs font-black">简介</span>
              </span>
              <div>
                <p className="text-xs font-black text-[#7A6D5E]">描述</p>
                <p className="mt-1 text-sm text-[#2B241E]">{workspace.description}</p>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-[#F7F1E7] p-4 text-center">
              <p className="text-xs font-black text-[#7A6D5E]">类型</p>
              <p className="mt-1 text-sm font-black text-[#2B241E]">
                {workspace.workspaceType === "enterprise" ? "企业" : workspace.workspaceType === "team" ? "团队" : "个人"}
              </p>
            </div>
            <div className="rounded-xl bg-[#F7F1E7] p-4 text-center">
              <p className="text-xs font-black text-[#7A6D5E]">我的角色</p>
              <p className={`mt-1 text-sm font-black ${isOwner ? "text-[#8C612E]" : workspace.myRole === "admin" ? "text-[#6F8F4E]" : workspace.myRole === "member" ? "text-[#5F5347]" : "text-[#7A6D5E]"}`}>
                {workspace.myRole === "owner" ? "所有者" : workspace.myRole === "admin" ? "管理员" : workspace.myRole === "member" ? "成员" : "查看者"}
              </p>
            </div>
            <div className="rounded-xl bg-[#F7F1E7] p-4 text-center">
              <p className="text-xs font-black text-[#7A6D5E]">状态</p>
              <p className={`mt-1 text-sm font-black ${workspace.isActive ? "text-[#6F8F4E]" : "text-[#B42318]"}`}>
                {workspace.isActive ? "活跃" : "已停用"}
              </p>
            </div>
          </div>

          {!canEdit && (
            <p className="text-center text-xs text-[#7A6D5E]">你没有编辑权限</p>
          )}
        </div>
      )}
    </div>
  );
}
