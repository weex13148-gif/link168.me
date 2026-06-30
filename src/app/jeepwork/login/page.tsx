"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function JeepworkLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const response = await fetch("/api/jeepwork/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !result.success) {
        setMessage("账号或密码错误。");
        setLoading(false);
        return;
      }
      router.push("/jeepwork");
      router.refresh();
    } catch {
      setMessage("账号或密码错误。");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-7 shadow-[0_24px_80px_rgba(86,68,46,0.10)]">
        <h1 className="text-2xl font-black text-[#2B241E]">内部工作台</h1>
        <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">请使用管理员账号登录。</p>
        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-[#2B241E]">邮箱</span>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm text-[#2B241E] outline-none focus:border-[#6F8F4E]"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold text-[#2B241E]">密码</span>
            <input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm text-[#2B241E] outline-none focus:border-[#6F8F4E]"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="min-h-11 rounded-2xl bg-[#6F8F4E] text-sm font-black text-white disabled:opacity-60"
          >
            {loading ? "登录中…" : "登录"}
          </button>
          {message ? (
            <p className="mt-2 rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">{message}</p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
