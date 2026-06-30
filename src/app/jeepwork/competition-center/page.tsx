"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import CompetitionCenterClient from "@/components/showcase/CompetitionCenterClient";
import type { ShowcaseV2SectionKey } from "@/lib/showcase-v2";

type AdminUser = { email: string; role: string };

type InitialConfig = {
  enabled: boolean;
  hasPassword: boolean;
  updatedAt: string | null;
  sections: Record<ShowcaseV2SectionKey, boolean>;
  sectionLabels: Record<ShowcaseV2SectionKey, string>;
};

type InitialLog = {
  id: string;
  createdAt: string;
  result: string;
  referrer: string | null;
  rawIp: string;
  maskedIp: string;
  ipHash: string;
  userAgent: string;
  browser: string;
  os: string;
  deviceType: string;
};

export default function CompetitionCenterPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [config, setConfig] = useState<InitialConfig | null>(null);
  const [logs, setLogs] = useState<InitialLog[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetch("/api/jeepwork/auth/me", { cache: "no-store" });
        if (!me.ok) {
          if (!cancelled) router.push("/jeepwork/login");
          return;
        }
        const meJson = (await me.json()) as { success?: boolean; user?: AdminUser };
        if (cancelled) return;
        if (meJson.success && meJson.user?.role === "super_admin") {
          setUser(meJson.user);
        } else {
          router.push("/jeepwork");
          return;
        }
        const res = await fetch("/api/jeepwork/showcase", { cache: "no-store" });
        const json = (await res.json()) as { success?: boolean; data?: { config: InitialConfig; logs: InitialLog[] } };
        if (cancelled) return;
        if (json.success && json.data) {
          setConfig(json.data.config);
          setLogs(json.data.logs);
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
    if (!window.confirm("确定要退出管理员后台吗？")) return;
    setLoggingOut(true);
    try {
      await fetch("/api/jeepwork/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    router.push("/jeepwork/login");
    router.refresh();
  }

  return (
    <AdminShell
      currentPageLabel="比赛中心"
      currentUserEmail={user?.email}
      currentUserRole={user?.role}
      onLogout={loggingOut ? undefined : onLogout}
      pageHeader={{
        eyebrow: "Competition Center",
        title: "比赛中心（超级管理员）",
        subtitle: "管理总开关、9 大章节内容、章节顺序、AI 演示配置、文件管理、访问统计与 IP 查看",
        highlight: "#315F8C",
      }}
    >
      {config ? (
        <CompetitionCenterClient initialConfig={config} initialLogs={logs} />
      ) : (
        <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 text-sm font-bold text-[#7A6D5E] shadow-sm">
          正在加载比赛中心数据…
        </section>
      )}
    </AdminShell>
  );
}
