"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ShowcaseGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetch("/api/showcase/session", { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json() as { success?: boolean };
        setAuthed(!!json.success);
      })
      .catch(() => setAuthed(false));
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/showcase/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = (await response.json()) as { success?: boolean; error?: { message?: string } };
      if (!response.ok || !result.success) {
        setMessage(result.error?.message || "访问密码不正确，可以立即重试。");
        return;
      }
      setAuthed(true);
    } catch {
      setMessage("网络连接失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  if (authed === null) {
    return (
      <div className="ui-page grid min-h-dvh place-items-center">
        <p className="text-sm font-bold text-[var(--ui-muted)]">正在验证访问权限...</p>
      </div>
    );
  }

  if (authed) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--ui-page)] text-[var(--ui-ink)]">
      <div className="ui-container flex min-h-dvh items-center py-8 sm:py-12">
        <div className="grid w-full overflow-hidden rounded-[var(--ui-radius-xl)] border border-[var(--ui-line)] bg-[var(--ui-surface)] shadow-[var(--ui-shadow-md)] lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="p-7 sm:p-10 lg:p-12">
            <span className="grid size-12 place-items-center rounded-[var(--ui-radius-sm)] bg-[var(--ui-brand)] text-lg font-black text-white">L</span>
            <p className="ui-eyebrow mt-8">外部尽调入口</p>
            <h1 className="ui-title mt-3 text-4xl leading-tight sm:text-5xl">Link168 外部尽调整理</h1>
            <p className="ui-muted mt-5 max-w-2xl text-base leading-8">展示真实产品、已完成功能、AI 内测能力、商业模式和下一阶段规划。支持评委、投资人、政府三种视角。</p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[var(--ui-radius-sm)] bg-[var(--ui-success-soft)] p-4"><strong className="text-sm text-[var(--ui-success)]">核心主页闭环</strong><p className="ui-muted mt-1 text-sm">已完成</p></div>
              <div className="rounded-[var(--ui-radius-sm)] bg-[var(--ui-accent-soft)] p-4"><strong className="text-sm text-[#7D5B24]">AI 助理</strong><p className="ui-muted mt-1 text-sm">内测中</p></div>
              <div className="rounded-[var(--ui-radius-sm)] bg-[var(--ui-surface-muted)] p-4"><strong className="text-sm">正式支付</strong><p className="ui-muted mt-1 text-sm">未来规划</p></div>
            </div>

            <Link href="/" className="mt-8 inline-flex text-sm font-black text-[var(--ui-brand-hover)] hover:underline">返回 Link168 首页</Link>
          </section>

          <aside className="border-t border-[var(--ui-line)] bg-[var(--ui-surface-muted)] p-7 sm:p-9 lg:border-l lg:border-t-0">
            <p className="text-sm font-black">输入评委共享密码</p>
            <p className="ui-muted mt-2 text-sm leading-6">密码由项目方或比赛提交材料提供。验证成功后，本设备可以直接查看展示内容。</p>
            <form onSubmit={onSubmit} className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-black">比赛访问密码</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="ui-input" placeholder="请输入评委共享密码" autoComplete="current-password" autoFocus />
              </label>
              {message ? <p className="rounded-[var(--ui-radius-sm)] bg-[var(--ui-danger-soft)] px-4 py-3 text-sm font-bold text-[var(--ui-danger)]">{message}</p> : null}
              <button type="submit" disabled={loading || !password.trim()} className="ui-button-primary min-h-12 w-full text-base disabled:cursor-not-allowed disabled:opacity-60">{loading ? "正在验证…" : "进入比赛展示"}</button>
              <p className="text-xs leading-5 text-[var(--ui-muted)]">本入口仅用于比赛评审与审核，不会出现在普通用户首页。</p>
            </form>
          </aside>
        </div>
      </div>
    </div>
  );
}
