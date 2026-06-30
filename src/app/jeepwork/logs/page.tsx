"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AdminUser = { email: string; role: string };

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
  ipHash: string | null;
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

type LogData = {
  type: string;
  total: number;
  page: number;
  totalPages: number;
  logs: LoginLog[] | AuditLog[] | SessionLog[];
};

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

export default function JeepworkLogsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logType, setLogType] = useState<"login" | "admin_audit" | "session">("login");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [logs, setLogs] = useState<LoginLog[] | AuditLog[] | SessionLog[]>([]);
  const [showIp, setShowIp] = useState(false);
  const [reason, setReason] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/jeepwork/auth/me", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) router.push("/jeepwork/login");
          return;
        }
        const result = (await response.json()) as { success?: boolean; user?: AdminUser };
        if (!cancelled) {
          if (result.success && result.user?.role === "super_admin") {
            setUser(result.user);
          } else {
            router.push("/jeepwork");
          }
        }
      } catch {
        if (!cancelled) router.push("/jeepwork/login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const loadLogs = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("type", logType);
    params.set("page", String(page));
    if (showIp && reason) {
      params.set("showIp", "1");
      params.set("reason", reason);
    }
    try {
      const res = await fetch(`/api/jeepwork/logs?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json()) as { success?: boolean; data?: LogData };
      if (json.success && json.data) {
        setLogs(json.data.logs);
        setTotal(json.data.total);
        setTotalPages(json.data.totalPages);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user?.role === "super_admin") {
      void loadLogs();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, logType, page, showIp, reason]);

  async function onLogout() {
    const confirmed = window.confirm("确定要退出管理员后台吗？");
    if (!confirmed) return;
    setLoggingOut(true);
    try {
      await fetch("/api/jeepwork/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    router.push("/jeepwork/login");
    router.refresh();
  }

  async function handleCleanup() {
    if (!window.confirm("确定要清理 90 天前的历史数据吗？此操作不可撤销。")) return;
    try {
      const res = await fetch("/api/jeepwork/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cleanup" }),
      });
      const json = (await res.json()) as { success?: boolean; data?: { message?: string; deleted?: { sessions?: number; loginAttempts?: number; adminAuditLogs?: number; linkClicks?: number } } };
      if (json.success && json.data) {
        setActionMsg(json.data.message || "清理完成");
        void loadLogs();
      }
    } catch {
      setActionMsg("清理失败");
    }
  }

  async function handleViewIp() {
    if (!reason.trim()) {
      setActionMsg("查看原始 IP 必须填写原因");
      return;
    }
    setShowIp(true);
    setActionMsg("");
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <section className="flex flex-wrap items-center gap-3 rounded-[28px] border border-[#E8DCCB] bg-white p-4 shadow-sm sm:p-5">
        <a href="/jeepwork" className="mr-2 flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-2xl bg-[#6F8F4E] text-white text-base font-black">J</span>
          <span className="text-sm font-black tracking-wide text-[#2B241E]">Jeepwork 工作台</span>
        </a>
        <nav className="flex flex-1 flex-wrap items-center gap-1">
          {[
            { href: "/jeepwork", label: "后台首页" },
            { href: "/jeepwork/logs", label: "访问日志" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold bg-[#FFF9F0] text-[#2B241E]"
            >
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user?.email ? (
            <span className="hidden text-xs font-bold text-[#7A6D5E] sm:inline max-w-[200px] truncate">{user.email}</span>
          ) : null}
          {onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E] hover:bg-[#F5F0E7]"
            >
              退出登录
            </button>
          ) : null}
        </div>
      </section>

      <div className="mt-4 flex items-center gap-2 text-sm font-bold text-[#7A6D5E]">
        <a href="/jeepwork" className="text-[#6F8F4E] hover:underline">内部工作台</a>
        <span aria-hidden className="text-[#B8ACA0]">›</span>
        <span className="text-[#2B241E]">访问日志</span>
      </div>

      <section className="mt-4 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: "#5B6FFF" }}>Logs</p>
        <h1 className="mt-2 text-2xl font-black text-[#2B241E] sm:text-3xl">访问日志</h1>
        <p className="mt-1 text-sm leading-6 text-[#7A6D5E]">查看登录日志、管理员操作日志和会话日志。原始 IP 仅超级管理员可查看，且需要填写原因。</p>
      </section>

      {actionMsg ? (
        <div className="mt-4 rounded-2xl bg-[#E6F0D8] px-4 py-3 text-sm font-bold text-[#355126]">{actionMsg}</div>
      ) : null}

      <section className="mt-6 grid gap-3 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-[#2B241E]">日志类型</span>
          <select
            value={logType}
            onChange={(e) => { setLogType(e.target.value as "login" | "admin_audit" | "session"); setPage(1); }}
            className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm text-[#2B241E] outline-none"
          >
            <option value="login">登录日志</option>
            <option value="admin_audit">管理员操作日志</option>
            <option value="session">会话日志</option>
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-[#2B241E]">查看原始 IP（需填原因）</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="输入查看原因..."
            className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm text-[#2B241E] outline-none"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleViewIp()}
            className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E]"
          >
            查看原始 IP
          </button>
          <button
            type="button"
            onClick={() => void loadLogs()}
            className="min-h-11 rounded-2xl bg-[#6F8F4E] px-5 text-sm font-black text-white"
            disabled={loading}
          >
            {loading ? "刷新中…" : "刷新"}
          </button>
        </div>
      </section>

      <section className="mt-4 rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm text-[#B42318]">
        <strong>注意：</strong>原始 IP 仅在填写原因后显示。日志数据保留 90 天，超期后自动清理。
        <button
          type="button"
          onClick={() => void handleCleanup()}
          className="ml-4 rounded-2xl bg-[#B42318] px-4 py-1 text-sm font-bold text-white"
        >
          立即清理 90 天前数据
        </button>
      </section>

      <section className="mt-4 grid gap-3 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:grid-cols-3">
        <div className="rounded-2xl bg-[#FFF9E8] p-4">
          <p className="text-sm font-bold text-[#8C612E]">当前页数量</p>
          <p className="mt-2 text-2xl font-black text-[#2B241E]">{logs.length}</p>
        </div>
        <div className="rounded-2xl bg-[#E6F0D8] p-4">
          <p className="text-sm font-bold text-[#355126]">总记录数</p>
          <p className="mt-2 text-2xl font-black text-[#2B241E]">{total}</p>
        </div>
        <div className="rounded-2xl bg-[#F2EDE3] p-4">
          <p className="text-sm font-bold text-[#7A6D5E]">当前页 / 总页数</p>
          <p className="mt-2 text-2xl font-black text-[#2B241E]">{page} / {totalPages}</p>
        </div>
      </section>

      {loading ? (
        <div className="mt-6 rounded-[28px] border border-[#E8DCCB] bg-white p-10 text-center text-sm font-bold text-[#7A6D5E] shadow-sm">正在加载…</div>
      ) : logs.length === 0 ? (
        <div className="mt-6 rounded-[28px] border border-dashed border-[#E8DCCB] bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-black text-[#2B241E]">暂无记录</p>
        </div>
      ) : (
        <section className="mt-6 grid gap-4">
          {logs.map((log) => (
            <article key={(log as LoginLog).id || (log as AuditLog).id || (log as SessionLog).id} className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
              {logType === "login" && (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    {(log as LoginLog).success ? (
                      <span className="rounded-2xl bg-[#E6F0D8] px-3 py-1 text-xs font-black text-[#355126]">成功</span>
                    ) : (
                      <span className="rounded-2xl bg-[#FFF1F0] px-3 py-1 text-xs font-black text-[#B42318]">失败</span>
                    )}
                    {(log as LoginLog).locked && (
                      <span className="rounded-2xl bg-[#FFF9E8] px-3 py-1 text-xs font-black text-[#8C612E]">已锁定</span>
                    )}
                  </div>
                  <p className="mt-3 text-lg font-black text-[#2B241E]">{(log as LoginLog).email}</p>
                  <p className="mt-1 text-sm text-[#6B5D4F]">IP：{(log as LoginLog).ipAddress}</p>
                  <p className="mt-1 text-sm text-[#6B5D4F]">时间：{formatDate((log as LoginLog).createdAt)}</p>
                </>
              )}
              {logType === "admin_audit" && (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    {(log as AuditLog).success ? (
                      <span className="rounded-2xl bg-[#E6F0D8] px-3 py-1 text-xs font-black text-[#355126]">成功</span>
                    ) : (
                      <span className="rounded-2xl bg-[#FFF1F0] px-3 py-1 text-xs font-black text-[#B42318]">失败</span>
                    )}
                    <span className="rounded-2xl bg-[#F2EDE3] px-3 py-1 text-xs font-black text-[#7A6D5E]">{(log as AuditLog).actorRole || "-"}</span>
                  </div>
                  <p className="mt-3 text-lg font-black text-[#2B241E]">{(log as AuditLog).actorEmail || "-"}</p>
                  <p className="mt-1 text-sm text-[#6B5D4F]">操作：{(log as AuditLog).action}</p>
                  <p className="mt-1 text-sm text-[#6B5D4F]">目标：{(log as AuditLog).targetType || "-"} / {(log as AuditLog).targetId || "-"}</p>
                  <p className="mt-1 text-sm text-[#6B5D4F]">IP Hash：{showIp ? ((log as AuditLog).ipHash || "-") : "(已屏蔽)"}</p>
                  <p className="mt-1 text-sm text-[#6B5D4F]">时间：{formatDate((log as AuditLog).createdAt)}</p>
                </>
              )}
              {logType === "session" && (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-2xl bg-[#F2EDE3] px-3 py-1 text-xs font-black text-[#7A6D5E]">{(log as SessionLog).userRole}</span>
                  </div>
                  <p className="mt-3 text-lg font-black text-[#2B241E]">{(log as SessionLog).userEmail}</p>
                  <p className="mt-1 text-sm text-[#6B5D4F]">IP：{(log as SessionLog).ipAddress}</p>
                  <p className="mt-1 text-sm text-[#6B5D4F]">创建：{formatDate((log as SessionLog).createdAt)}</p>
                  <p className="mt-1 text-sm text-[#6B5D4F]">最后活跃：{formatDate((log as SessionLog).lastActive)}</p>
                  <p className="mt-1 text-sm text-[#6B5D4F]">过期：{formatDate((log as SessionLog).expiresAt)}</p>
                </>
              )}
            </article>
          ))}
        </section>
      )}

      {!loading && totalPages > 1 && (
        <section className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((v) => Math.max(1, v - 1))}
            className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E]"
          >
            上一页
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
            className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E]"
          >
            下一页
          </button>
        </section>
      )}
    </main>
  );
}
