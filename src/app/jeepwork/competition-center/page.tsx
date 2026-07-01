"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import CompetitionCenterClient from "@/components/showcase/CompetitionCenterClient";
import {
  COMPETITION_FINAL_CHECKS,
  COMPETITION_MATERIALS,
  COMPETITION_PAGE_CONTENT,
} from "@/lib/competition-materials";
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

  const requiredFiles = COMPETITION_MATERIALS.filter((item) => item.required);

  return (
    <AdminShell
      currentPageLabel="比赛中心"
      currentUserEmail={user?.email}
      currentUserRole={user?.role}
      onLogout={loggingOut ? undefined : onLogout}
      pageHeader={{
        eyebrow: "决赛资料与展示管理",
        title: "Link168 比赛中心",
        subtitle: "统一管理展示开关、访问密码、页面内容、AI 演示、决赛文件、评委下载、访问统计与提交检查。",
        highlight: "var(--ui-brand)",
      }}
    >
      <div className="grid gap-6">
        <section className="ui-surface overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--ui-line)] px-5 py-4">
            <div>
              <h2 className="font-black text-[var(--ui-ink)]">决赛资料总清单</h2>
              <p className="ui-muted mt-1 text-xs">先准备必需资料，再补充证明与备份资料；实际上传状态在下方“文件管理”标签页查看。</p>
            </div>
            <a href="/showcase" target="_blank" className="ui-button-primary min-h-10">打开评委展示页</a>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3">
            {requiredFiles.map((item, index) => (
              <article key={item.id} className="border-b border-r border-[var(--ui-line)] p-5">
                <div className="flex items-start gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--ui-brand-soft)] text-xs font-black text-[var(--ui-brand)]">{index + 1}</span>
                  <div>
                    <h3 className="text-sm font-black text-[var(--ui-ink)]">{item.name}</h3>
                    <p className="ui-muted mt-2 text-xs leading-5">{item.description}</p>
                    <p className="mt-2 text-[11px] font-bold text-[var(--ui-faint)]">{item.format} · {item.owner}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="ui-surface overflow-hidden">
            <div className="border-b border-[var(--ui-line)] px-5 py-4">
              <h2 className="font-black text-[var(--ui-ink)]">展示页面必须包含</h2>
              <p className="ui-muted mt-1 text-xs">公开比赛页面和 PPT 的内容口径必须保持一致。</p>
            </div>
            <ol className="divide-y divide-[var(--ui-line)]">
              {COMPETITION_PAGE_CONTENT.map((item, index) => (
                <li key={item} className="flex gap-3 px-5 py-3 text-sm leading-6">
                  <span className="font-mono text-xs font-black text-[var(--ui-faint)]">{String(index + 1).padStart(2, "0")}</span>
                  <span className="text-[var(--ui-muted)]">{item}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="ui-surface overflow-hidden">
            <div className="border-b border-[var(--ui-line)] px-5 py-4">
              <h2 className="font-black text-[var(--ui-ink)]">提交前最终检查</h2>
              <p className="ui-muted mt-1 text-xs">只有全部确认后，才能把资料状态标记为最终版。</p>
            </div>
            <ol className="divide-y divide-[var(--ui-line)]">
              {COMPETITION_FINAL_CHECKS.map((item, index) => (
                <li key={item} className="flex gap-3 px-5 py-3 text-sm leading-6">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full border border-[var(--ui-line)] text-[10px] font-black text-[var(--ui-brand)]">{index + 1}</span>
                  <span className="text-[var(--ui-muted)]">{item}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {config ? (
          <CompetitionCenterClient initialConfig={config} initialLogs={logs} />
        ) : (
          <section className="ui-surface p-6 text-sm font-bold text-[var(--ui-muted)]">
            正在加载比赛中心数据…
          </section>
        )}
      </div>
    </AdminShell>
  );
}
