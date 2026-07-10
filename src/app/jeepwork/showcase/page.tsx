"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { useJeepworkLogout } from "@/components/admin/useJeepworkLogout";
import ShowcaseAdminClient from "@/components/showcase/ShowcaseAdminClient";

type AdminUser = { email: string; role: string };

export default function JeepworkShowcasePage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [tab, setTab] = useState<"config" | "files">("files");

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
          if (result.success && result.user?.role === "super_admin") {
            setUser(result.user);
          } else {
            router.push("/jeepwork");
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const t = url.searchParams.get("tab");
    if (t === "files" || t === "config") setTab(t);
  }, []);

  const logout = useJeepworkLogout(router);

  return (
    <AdminShell
      currentPageLabel="比赛文件管理"
      currentUserEmail={user?.email}
      currentUserRole={user?.role}
      onLogout={logout.open}
      pageHeader={{
        eyebrow: "Competition Files",
        title: "比赛文件管理",
        subtitle: "PPT / PDF / 视频 / 评委资料等文件的上传、下载、替换、删除与设主文件。",
        highlight: "#315F8C",
      }}
    >
      <div className="grid gap-4">
        <a
          href="/jeepwork/competition-center"
          className="rounded-[28px] border border-[#315F8C] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <p className="text-xs font-black uppercase tracking-widest text-[#315F8C]">推荐使用</p>
          <p className="mt-1 text-base font-black text-[#2B241E]">进入新版「比赛中心」</p>
          <p className="mt-1 text-sm text-[#7A6D5E]">整合总开关 / 内容管理 / 章节顺序 / AI 配置 / 访问统计 / IP 查看，文件管理已迁移到此。</p>
        </a>
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 text-sm leading-6 text-[#7A6D5E] shadow-sm">
          当前页面仅保留「比赛文件」标签页。{tab === "files" ? "正在显示文件管理。" : "请切换到「比赛文件」标签页管理文件。"}
        </div>
        <ShowcaseAdminClient />
      </div>
      {logout.Modal}
    </AdminShell>
  );
}
