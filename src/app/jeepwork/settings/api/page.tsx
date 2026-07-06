"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminSettingsApiClient from "@/components/admin/AdminSettingsApiClient";
import AdminShell from "@/components/admin/AdminShell";
import { useJeepworkLogout } from "@/components/admin/useJeepworkLogout";

type AdminUser = { email: string; role: string };

export default function JeepworkSettingsApiPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);

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
          if (result.success && result.user) {
            if (result.user.role !== "super_admin") {
              router.push("/jeepwork");
              return;
            }
            setUser(result.user);
          } else {
            router.push("/jeepwork/login");
          }
        }
      } catch {
        if (!cancelled) router.push("/jeepwork/login");
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  const logout = useJeepworkLogout(router);

  return (
    <AdminShell
      currentPageLabel="邮箱与系统配置"
      currentUserEmail={user?.email}
      currentUserRole={user?.role}
      onLogout={logout.open}
      pageHeader={{
        eyebrow: "系统配置",
        title: "邮箱验证与系统配置",
        subtitle: "统一管理注册验证码、忘记密码邮件、AI 接口、支付与存储配置。",
        highlight: "#5B6FFF",
      }}
    >
      <div className="mb-5 flex flex-col gap-3 rounded-[22px] border border-[#CFE0F5] bg-[#F3F8FF] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="font-black text-[#1357A6]">支付宝已经独立成正式配置页</p><p className="mt-1 text-sm text-[#58708A]">App ID、应用私钥、支付宝公钥、Seller ID 和异步通知地址统一在收款配置中管理。</p></div>
        <Link href="/jeepwork/settings/payment" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-[#1677FF] px-5 text-sm font-black text-white">进入支付宝配置</Link>
      </div>
      <AdminSettingsApiClient />
      {logout.Modal}
    </AdminShell>
  );
}
