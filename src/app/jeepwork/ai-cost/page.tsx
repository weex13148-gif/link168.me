"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AiCostDashboard from "@/components/ai-usage/AiCostDashboard";
import AdminShell from "@/components/admin/AdminShell";
import { AdminAlertBanner } from "@/components/admin/AdminKit";
import { useJeepworkLogout } from "@/components/admin/useJeepworkLogout";

type AdminUser = { email: string; role: string };

export default function JeepworkAiCostPage() {
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
      currentPageLabel="AI 成本分析"
      currentUserEmail={user?.email}
      currentUserRole={user?.role}
      onLogout={logout.open}
      pageHeader={{
        eyebrow: "AI Cost",
        title: "AI 成本分析",
        subtitle: "查看 AI 调用的成本分布、模型费用占比与趋势。",
        highlight: "#8C612E",
      }}
    >
      <AdminAlertBanner tone="warning" title="已知限制：AI 成本数据为 Credit 计数"><p>当前 AI 成本页仅展示 Credit 计数，未对接真实供应商账单。实际金额请以供应商账单为准。</p></AdminAlertBanner>
      <AiCostDashboard />
      {logout.Modal}
    </AdminShell>
  );
}
