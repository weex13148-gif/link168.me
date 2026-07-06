"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminReportsClient from "@/components/admin/AdminReportsClient";
import AdminShell from "@/components/admin/AdminShell";
import { useJeepworkLogout } from "@/components/admin/useJeepworkLogout";

type AdminUser = { email: string; role: string };

export default function JeepworkReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const logout = useJeepworkLogout(router);

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

  return (
    <AdminShell
      currentPageLabel="举报管理"
      currentUserEmail={user?.email}
      currentUserRole={user?.role}
      onLogout={logout.open}
      pageHeader={{
        eyebrow: "Reports",
        title: "举报管理",
        subtitle: "处理用户提交的内容举报、隐藏违规主页。",
        highlight: "#B42318",
      }}
    >
      <AdminReportsClient />
      {logout.Modal}
    </AdminShell>
  );
}
