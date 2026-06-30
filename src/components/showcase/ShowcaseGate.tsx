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
        setMessage(result.error?.message || "访问密码不正确，可以立即重试");
        return;
      }
      window.location.reload();
    } catch {
      setMessage("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 w-full max-w-md rounded-[20px] border border-[#DCD2C2] bg-white p-4 shadow-sm sm:mt-8 sm:rounded-[28px] sm:p-5">
      <label className="grid gap-2 text-xs font-black text-[#2B241E] sm:text-sm">
        比赛访问密码
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="min-h-11 rounded-xl border border-[#DCD2C2] px-3 text-sm font-bold outline-none focus:border-[#315F8C] sm:min-h-12 sm:rounded-2xl sm:px-4 sm:text-base"
          placeholder="请输入评委共享密码"
          autoComplete="current-password"
        />
      </label>
      {message ? <p className="mt-2 text-xs font-bold text-[#B42318] sm:text-sm">{message}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="mt-4 min-h-11 w-full rounded-xl bg-[#315F8C] px-4 text-sm font-black text-white disabled:opacity-60 sm:min-h-12 sm:rounded-2xl sm:text-base"
      >
        {loading ? "验证中..." : "进入展示中心"}
      </button>
      <p className="mt-3 text-[10px] leading-5 text-[#7A6D5E] sm:text-xs">密码输错可以立即重试；本页不设置验证码、IP 限流或账号锁定。</p>
    </form>
  );
}
