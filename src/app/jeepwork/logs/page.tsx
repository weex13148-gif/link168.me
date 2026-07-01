"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";

type AdminUser = { email: string; role: string };
type LogType = "login" | "admin_audit" | "session";

type LoginLog = {
  id: string;
  email: string;
  ipAddress: string;
  success: boolean;
  locked: boolean;
  lockUntil: string | null;
  createdAt: string;
};

type AuditLog = {
  id: string;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  success: boolean;
  ipAddress: string | null;
  createdAt: string;
};

type SessionLog = {
  id: string;
  userEmail: string;
  userRole: string;
  ipAddress: string;
  expiresAt: string;
  lastActive: string;
  createdAt: string;
};

type LogRow = LoginLog | AuditLog | SessionLog;
type LogData = { type: LogType; total: number; page: number; totalPages: number; logs: LogRow[] };

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
}

function statusBadge(ok: boolean, text?: string) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${ok ? "bg-[#EEF4E7] text-[#355126]" : "bg-[#FFF1F0] text-[#B42318]"}`}>{text || (ok ? "成功" : "失败")}</span>;
}

export default function JeepworkLogsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logType, setLogType] = useState<LogType>("login");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/jeepwork/auth/me", { cache: "no-store" });
        const result = await response.json() as { success?: boolean; user?: AdminUser };
        if (!response.ok || !result.success || result.user?.role !== "super_admin") {
          if (!cancelled) router.replace(response.ok ? "/jeepwork" : "/jeepwork/login");
          return;
        }
        if (!cancelled) setUser(result.user);
      } catch {
        if (!cancelled) router.replace("/jeepwork/login");
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  const loadLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/jeepwork/logs?type=${logType}&page=${page}`, { cache: "no-store" });
      const result = await response.json() as { success?: boolean; data?: LogData; error?: { message?: string } };
      if (!response.ok || !result.success || !result.data) {
        setMessage(result.error?.message || "日志加载失败。");
        return;
      }
      setLogs(result.data.logs);
      setTotal(result.data.total);
      setTotalPages(result.data.totalPages);
    } catch {
      setMessage("网络连接失败，无法加载日志。");
    } finally {
      setLoading(false);
    }
  }, [user, logType, page]);

  useEffect(() => { void loadLogs(); }, [loadLogs]);

  const filteredLogs = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return logs;
    return logs.filter((item) => JSON.stringify(item).toLowerCase().includes(keyword));
  }, [logs, query]);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/jeepwork/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/jeepwork/login");
    router.refresh();
  }

  async function cleanup() {
    if (!window.confirm("确定清理 180 天前的历史日志吗？")) return;
    try {
      const response = await fetch("/api/jeepwork/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cleanup" }),
      });
      const result = await response.json() as { success?: boolean; data?: { message?: string }; error?: { message?: string } };
      setMessage(result.success ? result.data?.message || "清理完成。" : result.error?.message || "清理失败。");
      if (result.success) await loadLogs();
    } catch {
      setMessage("网络连接失败，清理未完成。");
    }
  }

  function renderRows() {
    if (logType === "login") {
      return (filteredLogs as LoginLog[]).map((log) => (
        <tr key={log.id} className="border-t border-[#EEE5D8]">
          <td className="px-4 py-3 whitespace-nowrap">{formatDate(log.createdAt)}</td>
          <td className="px-4 py-3 max-w-[260px] truncate" title={log.email}>{log.email}</td>
          <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{log.ipAddress || "unknown"}</td>
          <td className="px-4 py-3">{statusBadge(log.success, log.locked ? "已锁定" : undefined)}</td>
          <td className="px-4 py-3 whitespace-nowrap">{formatDate(log.lockUntil)}</td>
        </tr>
      ));
    }

    if (logType === "admin_audit") {
      return (filteredLogs as AuditLog[]).map((log) => (
        <tr key={log.id} className="border-t border-[#EEE5D8]">
          <td className="px-4 py-3 whitespace-nowrap">{formatDate(log.createdAt)}</td>
          <td className="px-4 py-3 max-w-[240px] truncate" title={log.actorEmail || ""}>{log.actorEmail || "系统"}</td>
          <td className="px-4 py-3 whitespace-nowrap">{log.actorRole || "—"}</td>
          <td className="px-4 py-3 max-w-[260px] truncate" title={log.action}>{log.action}</td>
          <td className="px-4 py-3 max-w-[220px] truncate" title={`${log.targetType || ""} ${log.targetId || ""}`}>{log.targetType || "—"} {log.targetId || ""}</td>
          <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{log.ipAddress || "历史记录未保存"}</td>
          <td className="px-4 py-3">{statusBadge(log.success)}</td>
        </tr>
      ));
    }

    return (filteredLogs as SessionLog[]).map((log) => (
      <tr key={log.id} className="border-t border-[#EEE5D8]">
        <td className="px-4 py-3 whitespace-nowrap">{formatDate(log.createdAt)}</td>
        <td className="px-4 py-3 max-w-[260px] truncate" title={log.userEmail}>{log.userEmail}</td>
        <td className="px-4 py-3 whitespace-nowrap">{log.userRole}</td>
        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{log.ipAddress || "unknown"}</td>
        <td className="px-4 py-3 whitespace-nowrap">{formatDate(log.lastActive)}</td>
        <td className="px-4 py-3 whitespace-nowrap">{formatDate(log.expiresAt)}</td>
      </tr>
    ));
  }

  const columns = logType === "login"
    ? ["时间", "登录邮箱", "原始 IP", "结果", "锁定到期"]
    : logType === "admin_audit"
      ? ["时间", "操作账号", "角色", "操作类型", "操作目标", "原始 IP", "结果"]
      : ["时间", "用户邮箱", "角色", "原始 IP", "最近活动", "会话到期"];

  return (
    <AdminShell
      currentPageLabel="访问与安全日志"
      currentUserEmail={user?.email}
      currentUserRole={user?.role}
      onLogout={loggingOut ? undefined : logout}
      pageHeader={{ eyebrow: "日志与安全", title: "访问与安全日志", subtitle: "超级管理员可直接查看登录、会话和管理员操作的原始 IP。日志默认保留 180 天。", highlight: "#5B6FFF" }}
    >
      <div className="grid gap-5">
        <section className="flex flex-col gap-4 rounded-[24px] border border-[#E8DCCB] bg-white p-5 shadow-sm xl:flex-row xl:items-end xl:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-[220px_minmax(260px,1fr)]">
            <label className="grid gap-2 text-sm font-black">
              日志类型
              <select value={logType} onChange={(event) => { setLogType(event.target.value as LogType); setPage(1); }} className="min-h-11 rounded-xl border border-[#E8DCCB] bg-[#FFFDF8] px-3.5 font-normal">
                <option value="login">登录日志</option>
                <option value="admin_audit">管理员操作日志</option>
                <option value="session">用户会话日志</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-black">
              搜索当前页
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索邮箱、IP、操作类型或目标" className="min-h-11 rounded-xl border border-[#E8DCCB] bg-[#FFFDF8] px-3.5 font-normal" />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void loadLogs()} disabled={loading} className="min-h-11 rounded-xl bg-[#6F8F4E] px-5 text-sm font-black text-white disabled:opacity-60">{loading ? "刷新中…" : "刷新日志"}</button>
            <button type="button" onClick={() => void cleanup()} className="min-h-11 rounded-xl border border-[#D7CBBB] bg-white px-5 text-sm font-black text-[#8C612E]">清理 180 天前日志</button>
          </div>
        </section>

        {message ? <p className="rounded-2xl bg-[#FFF9E8] px-4 py-3 text-sm font-bold text-[#8C612E]">{message}</p> : null}

        <section className="overflow-hidden rounded-[24px] border border-[#E8DCCB] bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-[#E8DCCB] px-5 py-4">
            <p className="font-black text-[#2B241E]">共 {total} 条记录</p>
            <p className="text-sm font-bold text-[#7A6D5E]">第 {page} / {totalPages} 页</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-[#F7F3EC] text-xs font-black text-[#6F6255]">
                <tr>{columns.map((column) => <th key={column} className="px-4 py-3 whitespace-nowrap">{column}</th>)}</tr>
              </thead>
              <tbody className="text-[#3F352C]">
                {loading ? <tr><td colSpan={columns.length} className="px-5 py-12 text-center font-bold text-[#7A6D5E]">正在加载日志…</td></tr> : null}
                {!loading && filteredLogs.length === 0 ? <tr><td colSpan={columns.length} className="px-5 py-12 text-center font-bold text-[#7A6D5E]">暂无符合条件的记录</td></tr> : null}
                {!loading ? renderRows() : null}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-[#E8DCCB] px-5 py-4">
            <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="min-h-10 rounded-xl border border-[#E8DCCB] px-4 text-sm font-bold disabled:opacity-40">上一页</button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="min-h-10 rounded-xl border border-[#E8DCCB] px-4 text-sm font-bold disabled:opacity-40">下一页</button>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
