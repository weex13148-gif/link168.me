"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminPaymentSettingsClient from "@/components/admin/AdminPaymentSettingsClient";
import AdminShell from "@/components/admin/AdminShell";

type AdminUser = { email: string; role: string };

export default function JeepworkPaymentSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/jeepwork/auth/me", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) router.push("/jeepwork/login");
          return;
        }
        const result = await response.json() as { success?: boolean; user?: AdminUser };
        if (!cancelled && result.success && result.user) {
          if (result.user.role !== "super_admin") {
            router.push("/jeepwork");
            return;
          }
          setUser(result.user);
        }
      } catch {
        if (!cancelled) router.push("/jeepwork/login");
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  async function onLogout() {
    if (!window.confirm("确定要退出管理员后台吗？")) return;
    setLoggingOut(true);
    try {
      await fetch("/api/jeepwork/auth/logout", { method: "POST" });
    } finally {
      router.push("/jeepwork/login");
      router.refresh();
    }
  }

  return (
    <AdminShell
      currentPageLabel="支付宝与收费"
      currentUserEmail={user?.email}
      currentUserRole={user?.role}
      onLogout={loggingOut ? undefined : onLogout}
      pageHeader={{
        eyebrow: "收款配置",
        title: "支付宝与会员收费",
        subtitle: "管理支付宝正式收款参数、支付开关和测试模式。当前网站仅开放支付宝，微信支付后续开放。",
        highlight: "#1677FF",
      }}
    >
      <AdminPaymentSettingsClient />
    </AdminShell>
  );
}
