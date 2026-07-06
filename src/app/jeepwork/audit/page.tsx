"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { useJeepworkLogout } from "@/components/admin/useJeepworkLogout";

type AdminUser = { email: string; role: string };

type AuditLog = {
  id: string;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  success: boolean;
  metadataRaw: string | null;
  ipHash: string | null;
  userAgent: string | null;
  createdAt: string;
};

type LogData = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  logs: AuditLog[];
};

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    "admin.update_user_role": "修改用户角色",
    "admin.reset_user_password": "重置密码",
    "admin.freeze_user": "冻结用户",
    "admin.unfreeze_user": "解除冻结",
    "admin.ban_user": "封禁用户",
    "admin.unban_user": "解除封禁",
    "admin.view_original_ip": "查看原始IP",
    "admin.data_cleanup": "数据清理",
    "admin.update_profile_visibility": "修改主页可见性",
    "admin.process_report": "处理举报",
    "admin.delete_report": "删除举报",
    "admin.update_system_config": "修改系统配置",
    "admin.login_success": "登录成功",
    "admin.login_failed": "登录失败",
    "admin.update_showcase_content": "更新展示内容",
    "admin.update_showcase_sequence": "更新展示顺序",
    "admin.upload_competition_file": "上传比赛文件",
    "admin.download_competition_file": "下载比赛文件",
    "admin.replace_competition_file": "替换比赛文件",
    "admin.delete_competition_file": "删除比赛文件",
  };
  return map[action] || action;
}

function roleLabel(role: string) {
  if (role === "super_admin") return "超级管理员";
  if (role === "admin") return "管理员";
  if (role === "user") return "普通用户";
  return role || "-";
}

export default function JeepworkAuditPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const logout = useJeepworkLogout(router);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [actionMsg, setActionMsg] = useState("");

  // 过滤状态
  const [actionFilter, setActionFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [targetTypeFilter, setTargetTypeFilter] = useState("");
  const [successFilter, setSuccessFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showIp, setShowIp] = useState(false);
  const [ipReason, setIpReason] = useState("");
  const [pageSize, setPageSize] = useState(50);

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

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setActionMsg("");
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (actionFilter) params.set("action", actionFilter);
    if (actorFilter) params.set("actor", actorFilter);
    if (targetTypeFilter) params.set("targetType", targetTypeFilter);
    if (successFilter) params.set("success", successFilter);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    if (showIp && ipReason) {
      params.set("showIp", "1");
      params.set("reason", ipReason);
    }
    try {
      const res = await fetch(`/api/jeepwork/audit?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json()) as { success?: boolean; data?: LogData };
      if (json.success && json.data) {
        setLogs(json.data.logs);
        setTotal(json.data.total);
        setTotalPages(json.data.totalPages);
      }
    } catch {
      setActionMsg("加载审计日志失败");
    }
    setLoading(false);
  }, [page, actionFilter, actorFilter, targetTypeFilter, successFilter, dateFrom, dateTo, showIp, ipReason, pageSize]);

  useEffect(() => {
    if (user?.role === "super_admin") {
      void loadLogs();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page, showIp, ipReason]);

  async function handleViewIp() {
    if (!ipReason.trim()) {
      setActionMsg("查看原始 IP 必须填写原因");
      return;
    }
    setShowIp(true);
    setActionMsg("");
  }

  return (
    <AdminShell
      currentPageLabel="审计日志"
      currentUserEmail={user?.email}
      currentUserRole={user?.role}
      onLogout={logout.open}
      pageHeader={{
        eyebrow: "Audit",
        title: "审计日志",
        subtitle: "查看所有管理员操作的完整审计记录，支持按操作类型、操作者、时间范围过滤。",
        highlight: "#B42318",
      }}
    >
      {actionMsg ? (
        <div className="rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">{actionMsg}</div>
      ) : null}

      {/* 过滤条件 */}
      <section className="grid gap-3 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
        <p className="text-sm font-black text-[#2B241E]">筛选条件</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-1">
            <span className="text-xs font-bold text-[#7A6D5E]">操作类型</span>
            <input
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              placeholder="如 admin.freeze_user"
              className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 text-sm text-[#2B241E] outline-none"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold text-[#7A6D5E]">操作者邮箱</span>
            <input
              value={actorFilter}
              onChange={(e) => { setActorFilter(e.target.value); setPage(1); }}
              placeholder="操作者邮箱..."
              className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 text-sm text-[#2B241E] outline-none"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold text-[#7A6D5E]">目标类型</span>
            <input
              value={targetTypeFilter}
              onChange={(e) => { setTargetTypeFilter(e.target.value); setPage(1); }}
              placeholder="如 user"
              className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 text-sm text-[#2B241E] outline-none"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold text-[#7A6D5E]">结果</span>
            <select
              value={successFilter}
              onChange={(e) => { setSuccessFilter(e.target.value); setPage(1); }}
              className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 text-sm text-[#2B241E] outline-none"
            >
              <option value="">全部</option>
              <option value="true">成功</option>
              <option value="false">失败</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold text-[#7A6D5E]">开始日期</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 text-sm text-[#2B241E] outline-none"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold text-[#7A6D5E]">结束日期</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 text-sm text-[#2B241E] outline-none"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold text-[#7A6D5E]">每页条数</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 text-sm text-[#2B241E] outline-none"
            >
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold text-[#7A6D5E]">查看原因</span>
            <input
              value={ipReason}
              onChange={(e) => setIpReason(e.target.value)}
              placeholder="输入查看 IP 原因..."
              className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 text-sm text-[#2B241E] outline-none"
            />
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleViewIp()}
            className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E]"
          >
            查看原始 IP
          </button>
          <button
            type="button"
            onClick={() => void loadLogs()}
            className="min-h-10 rounded-2xl bg-[#6F8F4E] px-5 text-sm font-black text-white"
            disabled={loading}
          >
            {loading ? "加载中…" : "搜索"}
          </button>
          <button
            type="button"
            onClick={() => {
              setActionFilter("");
              setActorFilter("");
              setTargetTypeFilter("");
              setSuccessFilter("");
              setDateFrom("");
              setDateTo("");
              setShowIp(false);
              setIpReason("");
              setPage(1);
            }}
            className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#7A6D5E]"
          >
            重置
          </button>
        </div>
      </section>

      {/* 统计 */}
      <section className="grid gap-3 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:grid-cols-3">
        <div className="rounded-2xl bg-[#FFF9E8] p-4">
          <p className="text-sm font-bold text-[#8C612E]">当前页数量</p>
          <p className="mt-2 text-2xl font-black text-[#2B241E]">{logs.length}</p>
        </div>
        <div className="rounded-2xl bg-[#FFF1F0] p-4">
          <p className="text-sm font-bold text-[#B42318]">总记录数</p>
          <p className="mt-2 text-2xl font-black text-[#2B241E]">{total}</p>
        </div>
        <div className="rounded-2xl bg-[#F2EDE3] p-4">
          <p className="text-sm font-bold text-[#7A6D5E]">当前页 / 总页数</p>
          <p className="mt-2 text-2xl font-black text-[#2B241E]">{page} / {totalPages}</p>
        </div>
      </section>

      {/* 日志列表 */}
      {loading ? (
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-10 text-center text-sm font-bold text-[#7A6D5E] shadow-sm">
          正在加载审计日志…
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-[#E8DCCB] bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-black text-[#2B241E]">暂无审计记录</p>
        </div>
      ) : (
        <section className="grid gap-3">
          {logs.map((log) => (
            <article key={log.id} className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start gap-2">
                {log.success ? (
                  <span className="rounded-2xl bg-[#E6F0D8] px-3 py-1 text-xs font-black text-[#355126]">成功</span>
                ) : (
                  <span className="rounded-2xl bg-[#FFF1F0] px-3 py-1 text-xs font-black text-[#B42318]">失败</span>
                )}
                <span className="rounded-2xl bg-[#F2EDE3] px-3 py-1 text-xs font-black text-[#7A6D5E]">
                  {roleLabel(log.actorRole || "")}
                </span>
              </div>
              <p className="mt-3 text-base font-black text-[#2B241E]">
                {actionLabel(log.action)}
              </p>
              <div className="mt-2 grid gap-1 text-xs text-[#7A6D5E] sm:grid-cols-2 lg:grid-cols-3">
                <p>操作者：{log.actorEmail || "-"}</p>
                <p>目标类型：{log.targetType || "-"}</p>
                <p>目标ID：{log.targetId ? `${log.targetId.slice(0, 8)}...` : "-"}</p>
                {showIp && log.metadataRaw && (
                  <p className="col-span-full rounded-2xl bg-[#FFF9F0] p-2 font-mono text-xs">
                    数据：{log.metadataRaw.slice(0, 200)}{log.metadataRaw.length > 200 ? "..." : ""}
                  </p>
                )}
                <p>时间：{formatDate(log.createdAt)}</p>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* 分页 */}
      {!loading && totalPages > 1 && (
        <section className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((v) => Math.max(1, v - 1))}
            className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E] disabled:opacity-60"
          >
            上一页
          </button>
          <span className="text-sm font-bold text-[#7A6D5E]">
            第 {page} / {totalPages} 页
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
            className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E] disabled:opacity-60"
          >
            下一页
          </button>
        </section>
      )}
      {logout.Modal}
    </AdminShell>
  );
}
