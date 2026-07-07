import { redirect } from "next/navigation";
import { ShieldCheck, Mail, Key, Smartphone, Bell } from "lucide-react";
import WorkbenchShell from "@/components/workbench/WorkbenchShell";
import { db } from "@/lib/db";
import { getCurrentUserFromCookies } from "@/lib/auth";

export const runtime = "nodejs";

export default async function WorkbenchAccountPage() {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect("/login");

  const [membership, userRecord] = await Promise.all([
    db.membershipSubscription.findUnique({ where: { userId: user.id } }),
    db.user.findUnique({ where: { id: user.id }, select: { createdAt: true } }),
  ]);

  const isMember = membership?.status === "active";
  const planName = isMember
    ? { free: "免费版", starter: "初创版", pro: "专业版", enterprise: "企业版" }[membership?.planCode ?? "free"] ?? "免费版"
    : "免费版";

  const rows = [
    { label: "登录邮箱", value: user.email, icon: Mail, tone: "bg-[var(--ui-brand-soft)] text-[var(--ui-brand)]", action: null },
    {
      label: "邮箱验证",
      value: user.emailVerified ? "已验证" : "未验证 · 请前往邮箱查收验证链接",
      icon: Mail,
      tone: user.emailVerified ? "bg-[var(--ui-brand-soft)] text-[var(--ui-brand)]" : "bg-[#FFE6E2] text-[var(--ui-danger)]",
      action: null,
    },
    { label: "登录密码", value: "已设置 · 定期更换更安全", icon: Key, tone: "bg-[var(--ui-info-soft)] text-[var(--ui-info)]", action: "修改密码" },
    { label: "两步验证", value: "未开启 · 建议开启", icon: Smartphone, tone: "bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]", action: "开启" },
    { label: "通知设置", value: "仅接收重要经营提醒", icon: Bell, tone: "bg-[#FFE6E2] text-[var(--ui-danger)]", action: "配置" },
  ];

  const createdDate = userRecord?.createdAt
    ? new Date(userRecord.createdAt).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" })
    : "—";

  return (
    <WorkbenchShell
      eyebrow="Account & Security"
      title="账号与安全"
      subtitle="管理登录凭证、两步验证、通知偏好以及与账号相关的安全设置。"
    >
      <section className="rounded-[28px] border border-[var(--ui-line)] bg-[var(--ui-surface-strong)] p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid size-16 place-items-center rounded-3xl bg-[var(--ui-brand-soft)] text-2xl font-black text-[var(--ui-ink)]">
            {user.email.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="text-lg font-black text-[var(--ui-ink)]">{user.email}</p>
            <p className="text-xs text-[var(--ui-muted)]">{user.email} · 注册时间 {createdDate}</p>
          </div>
          <span className={`ml-auto rounded-full px-3 py-1.5 text-xs font-black ${isMember ? "bg-[var(--ui-success)] text-white" : "bg-[var(--ui-page)] text-[var(--ui-brand)]"}`}>
            {planName}
          </span>
        </div>
      </section>

      <section className="mt-6 grid gap-3">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div
              key={row.label}
              className="flex flex-wrap items-center gap-4 rounded-[24px] border border-[var(--ui-line)] bg-[var(--ui-surface-strong)] p-4 shadow-sm sm:p-5"
            >
              <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${row.tone}`}>
                <Icon aria-hidden className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-[var(--ui-ink)]">{row.label}</p>
                <p className="truncate text-xs text-[var(--ui-muted)]">{row.value}</p>
              </div>
              {row.action && (
                <span className="rounded-full bg-[var(--ui-ink)] px-4 py-2 text-xs font-black text-white">
                  {row.action}
                </span>
              )}
            </div>
          );
        })}
      </section>

      <section className="mt-6 rounded-[28px] border border-[var(--ui-line)] bg-[var(--ui-surface-strong)] p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck aria-hidden className="size-4 text-[var(--ui-brand)]" />
          <p className="text-sm font-black text-[var(--ui-brand)]">登录设备与历史</p>
        </div>
        <p className="mt-1 text-xs text-[var(--ui-muted)]">查看最近登录的设备，如发现异常请立即修改密码。</p>
        <div className="mt-4 rounded-2xl bg-[var(--ui-page)] p-4">
          <p className="text-sm text-[var(--ui-muted)]">
            登录历史仅超级管理员可见。如需查看，请联系超级管理员或在超级管理员后台的审计记录中查阅。
          </p>
        </div>
      </section>
    </WorkbenchShell>
  );
}
