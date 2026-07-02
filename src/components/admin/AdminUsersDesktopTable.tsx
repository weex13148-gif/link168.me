"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const PLAN_OPTIONS = [
  { value: "member_plus", label: "Plus 会员", credits: 300 },
  { value: "pro", label: "Pro 会员", credits: 2000 },
  { value: "enterprise", label: "企业会员", credits: 10000 },
  { value: "enterprise_pro_plus", label: "企业专业 Plus", credits: 50000 },
] as const;

type UserSummary = {
  id: string;
  email: string;
  emailVerified: boolean;
  role: string;
  isSystem: boolean;
  createdAt: string;
  profile: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isPublic: boolean;
  } | null;
  membership: {
    planCode: string;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    updatedAt: string | null;
  };
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  restrictions: Array<{ type: string; reason: string | null; expiresAt: string | null }>;
};

type SummaryData = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  users: UserSummary[];
  permissions?: {
    canManageMembership?: boolean;
    canViewRawIp?: boolean;
    canViewAllRoles?: boolean;
  };
};

type AdminEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: { code?: string; message?: string };
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
}

function roleLabel(role: string) {
  if (role === "super_admin") return "超级管理员";
  if (role === "admin") return "管理员";
  return "普通用户";
}

function planLabel(planCode: string) {
  if (planCode === "member_basic") return "Plus 会员（旧版）";
  if (planCode === "member_plus") return "Plus 会员";
  if (planCode === "pro") return "Pro 会员";
  if (planCode === "enterprise") return "企业会员";
  if (planCode === "enterprise_pro_plus") return "企业专业 Plus";
  if (planCode === "internal_test") return "内部测试";
  return "免费版";
}

function accountStatus(user: UserSummary) {
  const types = user.restrictions.map((item) => item.type);
  if (types.includes("BANNED")) return { label: "已封禁", className: "bg-[#FFF1F0] text-[#B42318]" };
  if (types.includes("ADMIN_FREEZE")) return { label: "已冻结", className: "bg-[#FFF7E8] text-[#8C612E]" };
  if (types.includes("EMAIL_UNVERIFIED")) return { label: "邮箱待验证限制", className: "bg-[#FFF7E8] text-[#8C612E]" };
  return { label: "正常", className: "bg-[#EEF4E7] text-[#355126]" };
}

function hasActiveMembership(user: UserSummary) {
  if (user.membership.status !== "active" || user.membership.planCode === "free") return false;
  if (!user.membership.currentPeriodEnd) return true;
  return new Date(user.membership.currentPeriodEnd).getTime() > Date.now();
}

function pickMessage<T>(payload: AdminEnvelope<T> | null, fallback: string) {
  return payload?.error?.message || fallback;
}

export default function AdminUsersDesktopTable({ currentUserRole }: { currentUserRole?: string | null }) {
  const [keyword, setKeyword] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [data, setData] = useState<SummaryData>({ page: 1, pageSize: 30, total: 0, totalPages: 1, users: [] });

  const [membershipUser, setMembershipUser] = useState<UserSummary | null>(null);
  const [membershipAction, setMembershipAction] = useState<"grant" | "revoke" | null>(null);
  const [planCode, setPlanCode] = useState("member_plus");
  const [durationDays, setDurationDays] = useState(365);
  const [grantMode, setGrantMode] = useState<"replace" | "extend">("replace");
  const [grantCredits, setGrantCredits] = useState(true);
  const [reason, setReason] = useState("");
  const [membershipSaving, setMembershipSaving] = useState(false);
  const [membershipError, setMembershipError] = useState("");

  const canViewAllRoles = data.permissions?.canViewAllRoles ?? currentUserRole === "super_admin";
  const canViewRawIp = data.permissions?.canViewRawIp ?? currentUserRole === "super_admin";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (keyword.trim()) params.set("q", keyword.trim());
      if (canViewAllRoles && role) params.set("role", role);
      const response = await fetch(`/api/jeepwork/users/summary?${params.toString()}`, { cache: "no-store" });
      const result = await response.json() as AdminEnvelope<SummaryData>;
      if (!response.ok || !result.success || !result.data) {
        setError(pickMessage(result, "用户总览加载失败。"));
        return;
      }
      setData(result.data);
    } catch {
      setError("网络连接失败，无法加载用户总览。");
    } finally {
      setLoading(false);
    }
  }, [canViewAllRoles, keyword, page, role]);

  useEffect(() => { void load(); }, [load]);

  function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    void load();
  }

  function openGrant(user: UserSummary) {
    const active = hasActiveMembership(user);
    setMembershipUser(user);
    setMembershipAction("grant");
    setPlanCode(active && user.membership.planCode !== "member_basic" ? user.membership.planCode : "member_plus");
    setDurationDays(365);
    setGrantMode(active ? "extend" : "replace");
    setGrantCredits(true);
    setReason("");
    setMembershipError("");
  }

  function openRevoke(user: UserSummary) {
    setMembershipUser(user);
    setMembershipAction("revoke");
    setReason("");
    setMembershipError("");
  }

  function closeMembershipModal() {
    if (membershipSaving) return;
    setMembershipUser(null);
    setMembershipAction(null);
    setMembershipError("");
    setReason("");
  }

  async function submitMembership() {
    if (!membershipUser || !membershipAction) return;
    if (!reason.trim()) {
      setMembershipError("请填写操作原因，原因会进入管理员审计日志。");
      return;
    }
    if (membershipAction === "grant" && (!Number.isSafeInteger(durationDays) || durationDays < 1 || durationDays > 3650)) {
      setMembershipError("会员天数必须是 1 至 3650 天的整数。");
      return;
    }

    setMembershipSaving(true);
    setMembershipError("");
    try {
      const response = await fetch(`/api/jeepwork/users/${membershipUser.id}/membership`, {
        method: membershipAction === "grant" ? "PUT" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(membershipAction === "grant"
          ? { planCode, durationDays, mode: grantMode, grantCredits, reason: reason.trim() }
          : { reason: reason.trim() }),
      });
      const result = await response.json() as AdminEnvelope<{ message?: string }>;
      if (!response.ok || !result.success) {
        setMembershipError(pickMessage(result, membershipAction === "grant" ? "会员开通失败。" : "会员注销失败。"));
        return;
      }

      setNotice(result.data?.message || (membershipAction === "grant" ? "会员已开通。" : "会员已注销。"));
      closeMembershipModal();
      await load();
    } catch {
      setMembershipError("网络连接失败，会员操作未完成。");
    } finally {
      setMembershipSaving(false);
    }
  }

  const selectedPlan = PLAN_OPTIONS.find((item) => item.value === planCode) || PLAN_OPTIONS[0];
  const columns = canViewRawIp ? 9 : 8;

  return (
    <section className="grid gap-4">
      <section className="rounded-[24px] border border-[#CFE0BD] bg-[#F5FAF0] p-5 shadow-sm">
        <h2 className="font-black text-[#2B241E]">手动会员管理</h2>
        <p className="mt-2 text-sm leading-6 text-[#5C6E4C]">
          管理员和超级管理员都可以给普通客户开通、续期、调整或注销会员。每次操作必须填写原因，并写入审计日志。
        </p>
      </section>

      <form onSubmit={search} className={`grid gap-3 rounded-[24px] border border-[#E8DCCB] bg-white p-5 shadow-sm ${canViewAllRoles ? "sm:grid-cols-[minmax(260px,1fr)_190px_auto]" : "sm:grid-cols-[minmax(260px,1fr)_220px_auto]"} sm:items-end`}>
        <label className="grid gap-2 text-sm font-black text-[#2B241E]">
          搜索客户
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="邮箱、用户名或显示名称" className="min-h-11 rounded-xl border border-[#E8DCCB] bg-[#FFFDF8] px-3.5 font-normal outline-none focus:border-[#6F8F4E]" />
        </label>
        {canViewAllRoles ? (
          <label className="grid gap-2 text-sm font-black text-[#2B241E]">
            用户角色
            <select value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }} className="min-h-11 rounded-xl border border-[#E8DCCB] bg-[#FFFDF8] px-3.5 font-normal outline-none">
              <option value="">全部角色</option>
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
              <option value="super_admin">超级管理员</option>
            </select>
          </label>
        ) : (
          <div className="grid gap-2 text-sm font-black text-[#2B241E]">
            管理范围
            <div className="flex min-h-11 items-center rounded-xl border border-[#E8DCCB] bg-[#F7F3EC] px-3.5 font-normal text-[#6F6255]">仅普通客户账号</div>
          </div>
        )}
        <button type="submit" disabled={loading} className="min-h-11 rounded-xl bg-[#6F8F4E] px-5 text-sm font-black text-white disabled:opacity-60">{loading ? "加载中…" : "搜索"}</button>
      </form>

      {notice ? <div className="flex items-start justify-between gap-3 rounded-2xl bg-[#EAF4E1] px-4 py-3 text-sm font-bold text-[#355126]"><span>{notice}</span><button type="button" onClick={() => setNotice("")} className="shrink-0">关闭</button></div> : null}
      {error ? <p className="rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">{error}</p> : null}

      <div className="overflow-hidden rounded-[24px] border border-[#E8DCCB] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8DCCB] px-5 py-4">
          <div>
            <h2 className="font-black text-[#2B241E]">客户与会员总览</h2>
            <p className="mt-1 text-xs text-[#7A6D5E]">共 {data.total} 名用户 · 第 {data.page} / {data.totalPages} 页</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="min-h-10 rounded-xl border border-[#E8DCCB] bg-white px-4 text-sm font-black text-[#3F5F31] disabled:opacity-50">刷新</button>
        </div>

        <div className="overflow-x-auto">
          <table className={`${canViewRawIp ? "min-w-[1420px]" : "min-w-[1280px]"} w-full text-left text-sm`}>
            <thead className="bg-[#F7F3EC] text-xs font-black text-[#6F6255]">
              <tr>
                <th className="px-4 py-3">用户</th>
                <th className="px-4 py-3">邮箱验证</th>
                <th className="px-4 py-3">会员等级</th>
                <th className="px-4 py-3">角色</th>
                <th className="px-4 py-3">账号状态</th>
                <th className="px-4 py-3">注册时间</th>
                <th className="px-4 py-3">最近登录</th>
                {canViewRawIp ? <th className="px-4 py-3">最近 IP</th> : null}
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="text-[#3F352C]">
              {loading ? <tr><td colSpan={columns} className="px-5 py-12 text-center font-bold text-[#7A6D5E]">正在加载用户数据…</td></tr> : null}
              {!loading && data.users.length === 0 ? <tr><td colSpan={columns} className="px-5 py-12 text-center font-bold text-[#7A6D5E]">暂无匹配用户</td></tr> : null}
              {!loading ? data.users.map((user) => {
                const status = accountStatus(user);
                const activeMembership = hasActiveMembership(user);
                const customerAccount = user.role === "user" && !user.isSystem;
                return (
                  <tr key={user.id} className="border-t border-[#EEE5D8] align-top">
                    <td className="px-4 py-3">
                      <div className="flex min-w-[210px] items-center gap-3">
                        {user.profile?.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={user.profile.avatarUrl} alt="" className="size-9 rounded-full object-cover" />
                        ) : <span className="grid size-9 place-items-center rounded-full bg-[#EEF4E7] font-black text-[#4F6D37]">{user.email.slice(0, 1).toUpperCase()}</span>}
                        <div className="min-w-0">
                          <p className="max-w-[220px] truncate font-black" title={user.email}>{user.email}</p>
                          <p className="mt-1 text-xs text-[#7A6D5E]">{user.profile ? `@${user.profile.username}${user.profile.displayName ? ` · ${user.profile.displayName}` : ""}` : "尚未创建主页"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{user.emailVerified ? <span className="rounded-full bg-[#EEF4E7] px-2.5 py-1 text-xs font-black text-[#355126]">已验证</span> : <span className="rounded-full bg-[#FFF7E8] px-2.5 py-1 text-xs font-black text-[#8C612E]">未验证</span>}</td>
                    <td className="px-4 py-3">
                      <div className="min-w-[150px]">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${activeMembership ? "bg-[#E8F2FF] text-[#285A9F]" : "bg-[#F2F0EC] text-[#6F6255]"}`}>{activeMembership ? planLabel(user.membership.planCode) : "免费版"}</span>
                        <p className="mt-2 text-[11px] leading-5 text-[#7A6D5E]">{activeMembership ? `有效至 ${formatDate(user.membership.currentPeriodEnd)}` : user.membership.status === "cancelled" ? "会员已注销" : "未开通会员"}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{roleLabel(user.role)}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-black ${status.className}`}>{status.label}</span></td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">{formatDate(user.lastLoginAt)}</td>
                    {canViewRawIp ? <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">{user.lastLoginIp || "—"}</td> : null}
                    <td className="px-4 py-3">
                      <div className="flex min-w-[250px] flex-wrap gap-2">
                        {user.profile ? <Link href={`/${user.profile.username}`} target="_blank" className="rounded-lg border border-[#E8DCCB] bg-white px-3 py-2 text-xs font-black text-[#3F5F31]">查看主页</Link> : null}
                        {customerAccount ? (
                          <>
                            <button type="button" onClick={() => openGrant(user)} className="rounded-lg bg-[#6F8F4E] px-3 py-2 text-xs font-black text-white">{activeMembership ? "调整/续期会员" : "添加会员"}</button>
                            {activeMembership ? <button type="button" onClick={() => openRevoke(user)} className="rounded-lg bg-[#B42318] px-3 py-2 text-xs font-black text-white">注销会员</button> : null}
                          </>
                        ) : <span className="rounded-lg bg-[#F2F0EC] px-3 py-2 text-xs font-bold text-[#7A6D5E]">非客户账号</span>}
                        {canViewAllRoles ? <a href="#advanced-user-management" className="rounded-lg border border-[#C8D0FF] bg-[#F0F2FF] px-3 py-2 text-xs font-black text-[#4B5CC4]">高级操作</a> : null}
                      </div>
                    </td>
                  </tr>
                );
              }) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#E8DCCB] px-5 py-4">
          <button type="button" disabled={data.page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} className="min-h-10 rounded-xl border border-[#E8DCCB] px-4 text-sm font-bold disabled:opacity-40">上一页</button>
          <button type="button" disabled={data.page >= data.totalPages || loading} onClick={() => setPage((value) => Math.min(data.totalPages, value + 1))} className="min-h-10 rounded-xl border border-[#E8DCCB] px-4 text-sm font-bold disabled:opacity-40">下一页</button>
        </div>
      </div>

      {membershipUser && membershipAction ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-[#2B241E]/55 p-4" onClick={closeMembershipModal} role="presentation">
          <section className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8] p-6 shadow-[0_30px_100px_rgba(43,36,30,0.3)]" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-[#6F8F4E]">手动会员管理</p>
                <h3 className="mt-1 text-xl font-black text-[#2B241E]">{membershipAction === "grant" ? (hasActiveMembership(membershipUser) ? "调整或续期会员" : "添加会员") : "注销会员"}</h3>
                <p className="mt-2 break-all text-sm text-[#7A6D5E]">客户：{membershipUser.email}</p>
              </div>
              <button type="button" onClick={closeMembershipModal} className="grid size-10 place-items-center rounded-xl bg-[#F2E7D8] text-xl text-[#7A6D5E]" aria-label="关闭">×</button>
            </div>

            {membershipAction === "grant" ? (
              <div className="mt-5 grid gap-4">
                <label className="grid gap-2 text-sm font-black text-[#2B241E]">
                  会员套餐
                  <select value={planCode} onChange={(event) => setPlanCode(event.target.value)} className="min-h-12 rounded-xl border border-[#E8DCCB] bg-white px-4 font-normal outline-none focus:border-[#6F8F4E]">
                    {PLAN_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-black text-[#2B241E]">
                    有效天数
                    <input type="number" min={1} max={3650} step={1} value={durationDays} onChange={(event) => setDurationDays(Number(event.target.value))} className="min-h-12 rounded-xl border border-[#E8DCCB] bg-white px-4 font-normal outline-none focus:border-[#6F8F4E]" />
                  </label>
                  <label className="grid gap-2 text-sm font-black text-[#2B241E]">
                    生效方式
                    <select value={grantMode} onChange={(event) => setGrantMode(event.target.value === "extend" ? "extend" : "replace")} className="min-h-12 rounded-xl border border-[#E8DCCB] bg-white px-4 font-normal outline-none focus:border-[#6F8F4E]">
                      <option value="replace">立即覆盖，从现在计算</option>
                      <option value="extend">同套餐续期，在到期日后顺延</option>
                    </select>
                  </label>
                </div>

                <label className="flex items-start gap-3 rounded-2xl border border-[#CFE0BD] bg-[#F5FAF0] p-4 text-sm leading-6 text-[#4F633F]">
                  <input type="checkbox" checked={grantCredits} onChange={(event) => setGrantCredits(event.target.checked)} className="mt-1 size-4 accent-[#6F8F4E]" />
                  <span><strong className="block text-[#355126]">同步发放套餐 AI 额度</strong>本次将发放 {selectedPlan.credits.toLocaleString("zh-CN")} Credits；再次手动续期会再次发放并留下额度流水。</span>
                </label>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-[#F2C7C3] bg-[#FFF1F0] p-4 text-sm leading-6 text-[#8E2F28]">
                注销后客户会立即恢复免费版，真实 AI 调用和付费权益会被关闭。历史订单、原会员信息、AI 额度流水和审计记录不会删除。
              </div>
            )}

            <label className="mt-5 grid gap-2 text-sm font-black text-[#2B241E]">
              操作原因（必填）
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={300} placeholder={membershipAction === "grant" ? "例如：线下收款已确认、赠送体验、合同客户手工开通" : "例如：客户申请取消、合同终止、误开通纠正"} className="resize-none rounded-xl border border-[#E8DCCB] bg-white px-4 py-3 font-normal outline-none focus:border-[#6F8F4E]" />
            </label>

            {membershipError ? <p className="mt-4 rounded-xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">{membershipError}</p> : null}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={closeMembershipModal} disabled={membershipSaving} className="min-h-12 rounded-xl border border-[#E8DCCB] bg-white text-sm font-black text-[#6F6255] disabled:opacity-50">取消</button>
              <button type="button" onClick={() => void submitMembership()} disabled={membershipSaving || !reason.trim()} className={`min-h-12 rounded-xl text-sm font-black text-white disabled:opacity-50 ${membershipAction === "grant" ? "bg-[#6F8F4E]" : "bg-[#B42318]"}`}>{membershipSaving ? "正在处理…" : membershipAction === "grant" ? "确认开通会员" : "确认注销会员"}</button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
