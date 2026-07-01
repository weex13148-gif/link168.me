"use client";

import { useState } from "react";

export default function ShowcaseGate() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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
      window.location.reload();
    } catch {
      setMessage("网络连接失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 grid w-full max-w-md gap-4 rounded-[var(--ui-radius-lg)] border border-[var(--ui-line)] bg-[var(--ui-surface)] p-5 shadow-[var(--ui-shadow-sm)]">
      <label className="grid gap-2">
        <span className="text-sm font-black text-[var(--ui-ink)]">比赛访问密码</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="ui-input"
          placeholder="请输入评委共享密码"
          autoComplete="current-password"
          autoFocus
        />
      </label>
      {message ? <p className="rounded-[var(--ui-radius-sm)] bg-[var(--ui-danger-soft)] px-4 py-3 text-sm font-bold text-[var(--ui-danger)]">{message}</p> : null}
      <button type="submit" disabled={loading || !password.trim()} className="ui-button-primary min-h-12 w-full text-base disabled:cursor-not-allowed disabled:opacity-60">
        {loading ? "正在验证…" : "进入比赛展示"}
      </button>
      <p className="text-xs leading-5 text-[var(--ui-muted)]">本入口仅用于比赛评审与审核。验证成功后，本设备可以直接查看展示内容。</p>
    </form>
  );
}
