"use client";

import { useState } from "react";
import { CheckCircle2, Crown, Laptop, Loader2, LockKeyhole, LogOut, Mail, RefreshCcw, ShieldCheck, Smartphone, Trash2, AlertTriangle, X } from "lucide-react";
import type { DashboardSession, DashboardUser } from "@/components/dashboard-v1/types";
import { formatDateTime } from "@/components/dashboard-v1/types";

function DeviceIcon({ device }: { device: string }) {
  return /安卓|iOS|手机/i.test(device) ? <Smartphone className="size-5" /> : <Laptop className="size-5" />;
}

export function AccountPanel({
  user,
  planLabel,
  isPaid,
  isLegacyActive,
  isGracePeriod,
  gracePeriodDays,
  daysRemaining,
  currentPeriodEnd,
  canUpgrade,
  sessions,
  sessionsLoading,
  resendingEmail,
  passwordSaving,
  deactivating,
  onResendEmail,
  onChangePassword,
  onRevokeSession,
  onRevokeOthers,
  onUpgrade,
  onLogout,
  onDeactivate,
}: {
  user: DashboardUser;
  planLabel: string;
  isPaid: boolean;
  isLegacyActive: boolean;
  isGracePeriod: boolean;
  gracePeriodDays: number;
  daysRemaining: number;
  currentPeriodEnd: string | null;
  canUpgrade: boolean;
  sessions: DashboardSession[];
  sessionsLoading: boolean;
  resendingEmail: boolean;
  passwordSaving: boolean;
  deactivating: boolean;
  onResendEmail: () => Promise<void>;
  onChangePassword: (payload: { oldPassword: string; newPassword: string; confirmPassword: string; logoutOtherDevices: boolean }) => Promise<boolean>;
  onRevokeSession: (sessionId: string) => Promise<void>;
  onRevokeOthers: () => Promise<void>;
  onUpgrade: () => void;
  onLogout: () => void;
  onDeactivate: (password: string) => Promise<boolean>;
}) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [logoutOtherDevices, setLogoutOtherDevices] = useState(true);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState("");
  const [deactivateError, setDeactivateError] = useState("");

  async function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await onChangePassword({ oldPassword, newPassword, confirmPassword, logoutOtherDevices });
    if (ok) {
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  const membershipDescription = !isPaid
    ? "免费版包含公开主页、基础资料、无限链接、免费主题和二维码。"
    : isGracePeriod
      ? `会员已到期，当前处于 ${gracePeriodDays} 天宽限期，请尽快续费。`
      : isLegacyActive
        ? "当前会员已开通，历史会员周期将在服务器统一校准后补齐。"
        : currentPeriodEnd
          ? `会员有效期至 ${formatDateTime(currentPeriodEnd)}，剩余约 ${daysRemaining} 天。`
          : "当前版本已解锁更多主题和高级能力。";

  return (
    <>
      <div className="grid gap-5">
      <header>
        <p className="ui-eyebrow">账户与安全</p>
        <h1 className="mt-1 text-2xl ui-title sm:text-3xl">管理登录、邮箱和版本</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 ui-muted">安全功能集中在这里，不再分散到弹窗或隐藏入口。</p>
      </header>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="ui-surface p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className={`grid size-10 place-items-center rounded-xl ${user.emailVerified ? "bg-[var(--ui-success-soft)] text-[var(--ui-success)]" : "bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]"}`}>
                {user.emailVerified ? <CheckCircle2 className="size-5" /> : <Mail className="size-5" />}
              </span>
              <div><h2 className="font-black">邮箱验证</h2><p className="mt-1 break-all text-sm ui-muted">{user.email}</p></div>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-black ${user.emailVerified ? "bg-[var(--ui-success-soft)] text-[var(--ui-success)]" : "bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]"}`}>{user.emailVerified ? "已验证" : "未验证"}</span>
          </div>
          <p className="mt-4 text-sm leading-6 ui-muted">{user.emailVerified ? "邮箱验证已完成，可正常使用找回密码和公开主页。" : "请完成验证。注册超过 30 天仍未验证时，公开主页可能暂停展示。"}</p>
          {!user.emailVerified ? <button type="button" onClick={() => void onResendEmail()} disabled={resendingEmail} className="ui-button-primary mt-5">{resendingEmail ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}{resendingEmail ? "正在发送…" : "重新发送验证码"}</button> : null}
        </section>

        <section className="ui-surface p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]"><Crown className="size-5" /></span>
              <div><h2 className="font-black">当前版本</h2><p className="mt-1 text-sm ui-muted">{planLabel}</p></div>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-black ${isGracePeriod ? "bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]" : "bg-[var(--ui-brand-soft)] text-[var(--ui-brand-hover)]"}`}>{isGracePeriod ? "宽限期" : planLabel}</span>
          </div>
          <p className="mt-4 text-sm leading-6 ui-muted">{membershipDescription}</p>
          {canUpgrade ? <button type="button" onClick={onUpgrade} className="ui-button-secondary mt-5"><Crown className="size-4 text-[var(--ui-accent)]" />{isGracePeriod ? "立即续费" : "查看会员版本"}</button> : null}
        </section>
      </div>

      <section className="ui-surface p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--ui-info-soft)] text-[var(--ui-info)]"><LockKeyhole className="size-5" /></span>
          <div><h2 className="text-lg font-black">修改密码</h2><p className="mt-1 text-xs ui-muted">修改成功后可同时退出其他设备。</p></div>
        </div>

        <form onSubmit={submitPassword} className="mt-5 grid gap-4 lg:grid-cols-3">
          <label className="grid gap-2"><span className="text-sm font-black">当前密码</span><input type="password" autoComplete="current-password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} className="ui-input" /></label>
          <label className="grid gap-2"><span className="text-sm font-black">新密码</span><input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={6} placeholder="至少 6 位" className="ui-input" /></label>
          <label className="grid gap-2"><span className="text-sm font-black">确认新密码</span><input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={6} className="ui-input" /></label>
          <label className="flex items-start gap-2 text-sm leading-6 ui-muted lg:col-span-2"><input type="checkbox" checked={logoutOtherDevices} onChange={(event) => setLogoutOtherDevices(event.target.checked)} className="mt-1 size-4 accent-[var(--ui-brand)]" /><span>修改密码后退出其他设备，当前设备保持登录。</span></label>
          <button type="submit" disabled={passwordSaving || !oldPassword || newPassword.length < 6 || newPassword !== confirmPassword} className="ui-button-primary lg:justify-self-end disabled:cursor-not-allowed disabled:opacity-45">{passwordSaving ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}{passwordSaving ? "正在修改…" : "修改密码"}</button>
        </form>
      </section>

      <section className="ui-surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--ui-line)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-black">登录设备</h2><p className="mt-1 text-xs ui-muted">可退出不认识的设备，保护账号安全。</p></div>
          <button type="button" onClick={() => void onRevokeOthers()} disabled={sessionsLoading || sessions.filter((session) => !session.isCurrent).length === 0} className="ui-button-secondary disabled:cursor-not-allowed disabled:opacity-45">退出其他设备</button>
        </div>
        <div className="divide-y divide-[var(--ui-line)]">
          {sessionsLoading ? <div className="flex min-h-24 items-center justify-center gap-2 text-sm ui-muted"><Loader2 className="size-4 animate-spin" />正在加载设备…</div> : null}
          {!sessionsLoading && sessions.length === 0 ? <div className="min-h-24 p-6 text-center text-sm ui-muted">没有可显示的登录设备。</div> : null}
          {!sessionsLoading ? sessions.map((session) => (
            <div key={session.id} className="flex items-center gap-3 px-5 py-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--ui-surface-muted)] text-[var(--ui-muted)]"><DeviceIcon device={session.device} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><p className="font-black">{session.device} · {session.browser}</p>{session.isCurrent ? <span className="rounded-full bg-[var(--ui-success-soft)] px-2 py-0.5 text-[10px] font-black text-[var(--ui-success)]">当前设备</span> : null}</div>
                <p className="mt-1 text-xs ui-muted">最近活动：{formatDateTime(session.lastActive)} · IP：{session.location}</p>
              </div>
              {!session.isCurrent ? <button type="button" onClick={() => void onRevokeSession(session.id)} className="grid size-9 place-items-center rounded-xl border border-[var(--ui-danger)]/20 bg-[var(--ui-danger-soft)] text-[var(--ui-danger)]" title="退出该设备"><Trash2 className="size-4" /></button> : null}
            </div>
          )) : null}
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-[18px] border border-[var(--ui-danger)]/18 bg-[var(--ui-danger-soft)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="font-black text-[var(--ui-danger)]">注销账号</h2><p className="mt-1 text-sm text-[var(--ui-danger)]/75">注销后账号及所有数据将被永久删除，无法恢复。</p></div>
        <button type="button" onClick={() => { setDeactivateModalOpen(true); setDeactivateError(""); setDeactivatePassword(""); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--ui-danger)]/30 bg-[var(--ui-surface-strong)]/60 px-4 text-sm font-black text-[var(--ui-danger)]"><AlertTriangle className="size-4" />注销账号</button>
      </section>

      <section className="flex flex-col gap-4 rounded-[18px] border border-[var(--ui-danger)]/18 bg-[var(--ui-danger-soft)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="font-black text-[var(--ui-danger)]">退出当前账号</h2><p className="mt-1 text-sm text-[var(--ui-danger)]/75">退出后需要重新输入邮箱和密码登录。</p></div>
        <button type="button" onClick={onLogout} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--ui-danger)] px-4 text-sm font-black text-white"><LogOut className="size-4" />退出登录</button>
      </section>
    </div>

    {deactivateModalOpen ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-2xl bg-[var(--ui-surface-strong)] p-6 shadow-xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[var(--ui-danger-soft)] text-[var(--ui-danger)]"><AlertTriangle className="size-5" /></span>
              <div>
                <h3 className="text-lg font-black">确认注销账号</h3>
                <p className="mt-1 text-xs ui-muted">此操作不可撤销，请谨慎操作。</p>
              </div>
            </div>
            <button type="button" onClick={() => setDeactivateModalOpen(false)} className="grid size-8 place-items-center rounded-lg text-[var(--ui-muted)] hover:bg-[var(--ui-surface-muted)]"><X className="size-4" /></button>
          </div>
          <div className="mt-4 space-y-3">
            <p className="text-sm text-[var(--ui-text)]">注销后将永久删除：</p>
            <ul className="list-disc space-y-1 pl-5 text-sm ui-muted">
              <li>您的账号信息和个人资料</li>
              <li>所有名片链接和模块数据</li>
              <li>主题、外观和自定义设置</li>
              <li>统计数据和访问记录</li>
            </ul>
            <label className="mt-4 grid gap-2">
              <span className="text-sm font-black">请输入登录密码确认</span>
              <input type="password" autoComplete="current-password" value={deactivatePassword} onChange={(event) => { setDeactivatePassword(event.target.value); setDeactivateError(""); }} className="ui-input" placeholder="输入密码以确认注销" />
              {deactivateError ? <p className="text-xs text-[var(--ui-danger)]">{deactivateError}</p> : null}
            </label>
          </div>
          <div className="mt-6 flex gap-3">
            <button type="button" onClick={() => setDeactivateModalOpen(false)} className="ui-button-secondary flex-1">取消</button>
            <button type="button" disabled={deactivating || !deactivatePassword} onClick={async () => {
              if (!deactivatePassword) return;
              const ok = await onDeactivate(deactivatePassword);
              if (!ok) setDeactivateError("密码错误或注销失败，请重试。");
            }} className="ui-button flex-1 items-center justify-center gap-2 bg-[var(--ui-danger)] text-white hover:bg-[var(--ui-danger)]/90 disabled:cursor-not-allowed disabled:opacity-45">
              {deactivating ? <Loader2 className="size-4 animate-spin" /> : <AlertTriangle className="size-4" />}
              {deactivating ? "注销中…" : "确认注销"}
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
