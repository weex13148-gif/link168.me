"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, Building2, Users, User } from "lucide-react";
import type { Workspace, WorkspaceType, WorkspaceRole } from "@/lib/workspace/client-types";

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  selectedId: string | null;
  onChange: (workspace: Workspace) => void;
  showCreate?: boolean;
}

function getTypeIcon(type: WorkspaceType) {
  switch (type) {
    case "enterprise":
      return Building2;
    case "team":
      return Users;
    default:
      return User;
  }
}

function getRoleBadge(role: WorkspaceRole | null) {
  switch (role) {
    case "owner":
      return "rounded-full bg-[var(--ui-warning)] px-2 py-0.5 text-[10px] font-black text-[var(--ui-surface)]";
    case "admin":
      return "rounded-full bg-[var(--ui-success)] px-2 py-0.5 text-[10px] font-black text-[var(--ui-surface)]";
    case "member":
      return "rounded-full bg-[var(--ui-line)] px-2 py-0.5 text-[10px] font-black text-[var(--ui-ink)]";
    case "viewer":
      return "rounded-full bg-[var(--ui-surface-muted)] px-2 py-0.5 text-[10px] font-black text-[var(--ui-muted)]";
    default:
      return "";
  }
}

function getRoleLabel(role: WorkspaceRole | null) {
  switch (role) {
    case "owner":
      return "所有者";
    case "admin":
      return "管理员";
    case "member":
      return "成员";
    case "viewer":
      return "查看者";
    default:
      return "";
  }
}

export default function WorkspaceSwitcher({ workspaces, selectedId, onChange, showCreate = true }: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", slug: "" });
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedWorkspace = workspaces.find((w) => w.id === selectedId);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setCreating(false);
        setFormError(null);
        setForm({ name: "", description: "", slug: "" });
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("请输入工作空间名称");
      return;
    }

    setCreating(true);
    setFormError(null);

    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          slug: form.slug.trim() || undefined,
          workspaceType: "enterprise" as WorkspaceType,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onChange(data.workspace);
        setIsOpen(false);
        setCreating(false);
        setForm({ name: "", description: "", slug: "" });
      } else {
        setFormError(data.error || "创建失败");
      }
    } catch {
      setFormError("网络错误，请稍后重试");
      setCreating(false);
    }
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface)] px-4 py-3 text-left shadow-sm hover:border-[var(--ui-brand)] sm:w-auto"
      >
        <div className="flex items-center gap-3">
          {selectedWorkspace ? (
            <>
              <span className="grid size-9 place-items-center rounded-xl bg-[var(--ui-success-soft)] text-[var(--ui-brand)]">
                {(() => {
                  const Icon = getTypeIcon(selectedWorkspace.workspaceType);
                  return <Icon className="size-5" />;
                })()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[var(--ui-ink)]">{selectedWorkspace.name}</p>
                <p className="truncate text-xs text-[var(--ui-muted)]">
                  {getRoleLabel(selectedWorkspace.myRole)} · {selectedWorkspace.workspaceType === "enterprise" ? "企业" : selectedWorkspace.workspaceType === "team" ? "团队" : "个人"}
                </p>
              </div>
            </>
          ) : (
            <>
              <span className="grid size-9 place-items-center rounded-xl bg-[var(--ui-surface-muted)] text-[var(--ui-muted)]">
                <Users className="size-5" />
              </span>
              <span className="text-sm font-black text-[var(--ui-muted)]">选择工作空间</span>
            </>
          )}
        </div>
        <ChevronDown className={`size-5 text-[var(--ui-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface)] shadow-lg sm:w-[320px]">
          <div className="max-h-[400px] overflow-y-auto">
            {creating ? (
              <div className="p-4">
                <p className="text-sm font-black text-[var(--ui-brand)]">创建工作空间</p>
                <form onSubmit={handleCreate} className="mt-4 space-y-3">
                  <label className="block text-xs font-black text-[var(--ui-muted)]">
                    名称 *
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      maxLength={50}
                      placeholder="企业名称"
                      className="mt-1 w-full rounded-xl border border-[var(--ui-line)] px-3 py-2 text-sm text-[var(--ui-ink)] placeholder-[var(--ui-muted)] focus:border-[var(--ui-brand)] focus:outline-none"
                    />
                  </label>
                  <label className="block text-xs font-black text-[var(--ui-muted)]">
                    描述
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      maxLength={200}
                      rows={2}
                      placeholder="企业简介"
                      className="mt-1 w-full resize-none rounded-xl border border-[var(--ui-line)] px-3 py-2 text-sm text-[var(--ui-ink)] placeholder-[var(--ui-muted)] focus:border-[var(--ui-brand)] focus:outline-none"
                    />
                  </label>
                  <label className="block text-xs font-black text-[var(--ui-muted)]">
                    自定义链接后缀（可选）
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))}
                      maxLength={32}
                      placeholder="company-name"
                      className="mt-1 w-full rounded-xl border border-[var(--ui-line)] px-3 py-2 text-sm text-[var(--ui-ink)] placeholder-[var(--ui-muted)] focus:border-[var(--ui-brand)] focus:outline-none"
                    />
                  </label>
                  {formError && (
                    <p className="text-xs text-[var(--ui-danger)]">{formError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCreating(false);
                        setFormError(null);
                        setForm({ name: "", description: "", slug: "" });
                      }}
                      className="flex-1 rounded-xl border border-[var(--ui-line)] px-3 py-2 text-xs font-black text-[var(--ui-muted)] hover:bg-[var(--ui-surface-muted)]"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="flex-1 rounded-xl bg-[var(--ui-success)] px-3 py-2 text-xs font-black text-[var(--ui-surface)] hover:bg-[var(--ui-success)] disabled:opacity-50"
                    >
                      {creating ? "创建中..." : "创建"}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <>
                <div className="p-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--ui-warning)]">我的工作空间</p>
                </div>

                {workspaces.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-[var(--ui-muted)]">还没有工作空间</p>
                ) : (
                  <ul className="divide-y divide-[#F7F1E7]">
                    {workspaces.map((workspace) => {
                      const Icon = getTypeIcon(workspace.workspaceType);
                      const isSelected = workspace.id === selectedId;
                      return (
                        <li key={workspace.id}>
                          <button
                            onClick={() => {
                              onChange(workspace);
                              setIsOpen(false);
                            }}
                            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                              isSelected ? "bg-[var(--ui-success-soft)]" : "hover:bg-[var(--ui-surface-muted)]"
                            }`}
                          >
                            <span className={`grid size-8 place-items-center rounded-xl ${isSelected ? "bg-[var(--ui-surface)]" : "bg-[var(--ui-line)]"}`}>
                              <Icon className={`size-4 ${isSelected ? "text-[var(--ui-brand)]" : "text-[var(--ui-muted)]"}`} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-black text-[var(--ui-ink)]">{workspace.name}</p>
                              <p className="truncate text-xs text-[var(--ui-muted)]">
                                {workspace.workspaceType === "enterprise" ? "企业" : workspace.workspaceType === "team" ? "团队" : "个人"}
                              </p>
                            </div>
                            <span className={getRoleBadge(workspace.myRole)}>
                              {getRoleLabel(workspace.myRole)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {showCreate && !creating && (
                  <div className="border-t border-[var(--ui-line)] p-3">
                    <button
                      onClick={() => setCreating(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--ui-line)] px-4 py-3 text-sm font-black text-[var(--ui-muted)] hover:border-[var(--ui-brand)] hover:text-[var(--ui-brand)]"
                    >
                      <Plus className="size-4" />
                      创建工作空间
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
