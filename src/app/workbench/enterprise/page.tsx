"use client";

import { useState, useEffect, useCallback } from "react";
import WorkbenchShell from "@/components/workbench/WorkbenchShell";
import WorkspaceSwitcher from "@/components/workspace/WorkspaceSwitcher";
import WorkspaceProfile from "@/components/workspace/WorkspaceProfile";
import MemberList from "@/components/workspace/MemberList";
import { Loader } from "lucide-react";
import type { Workspace, WorkspaceMember } from "@/lib/workspace/client-types";

type ViewTab = "profile" | "members";

export default function WorkbenchEnterprisePage() {
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [activeTab, setActiveTab] = useState<ViewTab>("profile");
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/workspaces", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setWorkspaces(data.workspaces ?? []);
        if (data.workspaces?.length > 0 && !currentWorkspace) {
          setCurrentWorkspace(data.workspaces[0]);
        }
      } else {
        setError(data.error || "加载工作空间失败");
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  const fetchWorkspaceDetail = useCallback(async (workspaceId: string) => {
    try {
      setError(null);
      const res = await fetch(`/api/workspaces/${workspaceId}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setCurrentWorkspace(data.workspace);
        setMembers(data.members ?? []);
      } else {
        setError(data.error || "加载工作空间详情失败");
      }
    } catch {
      setError("网络错误，请稍后重试");
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (currentWorkspace) {
      fetchWorkspaceDetail(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, fetchWorkspaceDetail]);

  const handleWorkspaceChange = useCallback((workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    setActiveTab("profile");
  }, []);

  const handleProfileUpdate = useCallback((updated: Workspace) => {
    setCurrentWorkspace(updated);
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === updated.id ? updated : w))
    );
  }, []);

  const handleMemberChange = useCallback((updatedMember: WorkspaceMember) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === updatedMember.id ? updatedMember : m))
    );
  }, []);

  const handleMemberAdd = useCallback((newMember: WorkspaceMember) => {
    setMembers((prev) => [newMember, ...prev]);
  }, []);

  const handleMemberRemove = useCallback((memberId: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  }, []);

  if (loading) {
    return (
      <WorkbenchShell eyebrow="Enterprise" title="企业工作空间" subtitle="管理企业资料与团队成员。">
        <div className="flex items-center justify-center py-20">
          <Loader className="size-6 animate-spin text-[var(--ui-brand)]" />
        </div>
      </WorkbenchShell>
    );
  }

  if (error) {
    return (
      <WorkbenchShell eyebrow="Enterprise" title="企业工作空间" subtitle="管理企业资料与团队成员。">
        <div className="rounded-[28px] border border-[var(--ui-line)] bg-[var(--ui-surface-strong)] p-8 text-center">
          <p className="text-sm text-[var(--ui-danger)]">{error}</p>
          <button
            onClick={fetchWorkspaces}
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--ui-success)] px-5 text-sm font-black text-white hover:bg-[var(--ui-success)]"
          >
            重新加载
          </button>
        </div>
      </WorkbenchShell>
    );
  }

  if (!currentWorkspace) {
    return (
      <WorkbenchShell eyebrow="Enterprise" title="企业工作空间" subtitle="创建或加入一个工作空间开始协作。">
        <div className="rounded-[28px] border border-[var(--ui-line)] bg-[var(--ui-surface-strong)] p-8 text-center">
          {workspaces.length === 0 ? (
            <>
              <p className="text-sm text-[var(--ui-muted)]">你还没有任何工作空间</p>
              <button
                onClick={() => setActiveTab("profile")}
                className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--ui-success)] px-5 text-sm font-black text-white hover:bg-[var(--ui-success)]"
              >
                创建工作空间
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-[var(--ui-muted)]">选择一个工作空间</p>
              <WorkspaceSwitcher
                workspaces={workspaces}
                selectedId={null}
                onChange={handleWorkspaceChange}
                showCreate
              />
            </>
          )}
        </div>
      </WorkbenchShell>
    );
  }

  return (
    <WorkbenchShell
      eyebrow="Enterprise"
      title={currentWorkspace.name}
      subtitle={`${currentWorkspace.description || "企业工作空间"} · ${currentWorkspace.myRole === "owner" ? "所有者" : currentWorkspace.myRole === "admin" ? "管理员" : currentWorkspace.myRole === "member" ? "成员" : "查看者"}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <WorkspaceSwitcher
          workspaces={workspaces}
          selectedId={currentWorkspace.id}
          onChange={handleWorkspaceChange}
          showCreate
        />
      </div>

      <div className="mt-4 flex gap-2 border-b border-[var(--ui-line)]">
        <button
          onClick={() => setActiveTab("profile")}
          className={`relative px-4 py-2 text-sm font-black transition ${
            activeTab === "profile"
              ? "text-[var(--ui-ink)]"
              : "text-[var(--ui-muted)] hover:text-[var(--ui-ink)]"
          }`}
        >
          企业资料
          {activeTab === "profile" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--ui-success)]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("members")}
          className={`relative px-4 py-2 text-sm font-black transition ${
            activeTab === "members"
              ? "text-[var(--ui-ink)]"
              : "text-[var(--ui-muted)] hover:text-[var(--ui-ink)]"
          }`}
        >
          成员管理
          <span className="ml-2 rounded-full bg-[var(--ui-page)] px-2 py-0.5 text-xs font-black text-[var(--ui-muted)]">
            {members.length}
          </span>
          {activeTab === "members" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--ui-success)]" />
          )}
        </button>
      </div>

      <div className="mt-4">
        {activeTab === "profile" && (
          <WorkspaceProfile
            workspace={currentWorkspace}
            onUpdate={handleProfileUpdate}
          />
        )}
        {activeTab === "members" && (
          <MemberList
            workspaceId={currentWorkspace.id}
            workspaceRole={currentWorkspace.myRole}
            members={members}
            onMemberChange={handleMemberChange}
            onMemberAdd={handleMemberAdd}
            onMemberRemove={handleMemberRemove}
          />
        )}
      </div>
    </WorkbenchShell>
  );
}
