"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminProfilesClient from "@/components/admin/AdminProfilesClient";
import AdminShell from "@/components/admin/AdminShell";
import { useJeepworkLogout } from "@/components/admin/useJeepworkLogout";

type AdminUser = { email: string; role: string };

export default function JeepworkProfilesPage() {
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
      currentPageLabel="主页管理"
      currentUserEmail={user?.email}
      currentUserRole={user?.role}
      onLogout={logout.open}
      pageHeader={{
        eyebrow: "Profiles",
        title: "主页管理",
        subtitle: "搜索、隐藏或恢复公开主页、下架链接。",
        highlight: "#6F8F4E",
      }}
    >
      <AdminProfilesClient />
      {logout.Modal}
    </AdminShell>
  );
}
