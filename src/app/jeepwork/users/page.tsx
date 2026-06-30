"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminUsersClient from "@/components/admin/AdminUsersClient";
import AdminShell from "@/components/admin/AdminShell";

type AdminUser = { email: string; role: string };

export default function JeepworkUsersPage() {
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
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onLogout() {
    const confirmed = window.confirm("确定要退出管理员后台吗？");
    if (!confirmed) return;
    setLoggingOut(true);
    try {
      await fetch("/api/jeepwork/auth/logout", { method: "POST" });
    } catch {
      // 忽略网络错误，仍然做前端跳转
    }
    router.push("/jeepwork/login");
    router.refresh();
  }

  return (
    <AdminShell
      currentPageLabel="用户管理"
      currentUserEmail={user?.email}
      currentUserRole={user?.role}
      onLogout={loggingOut ? undefined : onLogout}
      pageHeader={{
        eyebrow: "Users",
        title: "用户管理",
        subtitle: "修改用户角色、重置密码、查看使用统计。",
        highlight: "#5B6FFF",
      }}
    >
      <AdminUsersClient />
    </AdminShell>
  );
}
