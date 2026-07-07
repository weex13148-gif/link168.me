"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AiUsageDashboard from "@/components/ai-usage/AiUsageDashboard";
import AdminShell from "@/components/admin/AdminShell";
import { useJeepworkLogout } from "@/components/admin/useJeepworkLogout";

type AdminUser = { email: string; role: string };

export default function JeepworkAiUsagePage() {
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

  const logout = useJeepworkLogout(router);

  return (
    <AdminShell
      currentPageLabel="AI 用量统计"
      currentUserEmail={user?.email}
      currentUserRole={user?.role}
      onLogout={logout.open}
      pageHeader={{
        eyebrow: "AI Usage",
        title: "AI 用量统计",
        subtitle: "查看 AI 调用情况、Agent 与日期分布、错误分类。",
        highlight: "#8C612E",
      }}
    >
      <AiUsageDashboard />
      {logout.Modal}
    </AdminShell>
  );
}
