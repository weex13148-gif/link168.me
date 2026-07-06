"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AdminAlertBanner,
  AdminPasswordInput,
  adminInputClass,
} from "@/components/admin/AdminKit";

/**
 * /jeepwork/login — 平台管理员登录入口
 *
 * 仅做界面整理：
 *  - 明确"平台管理员入口"标识，避免普通用户误入
 *  - 密码字段支持可见性切换
 *  - 错误状态使用统一 AdminAlertBanner
 *  - 不修改任何认证 Cookie、登录 API 或角色判断
 *  - 不暴露管理员账号、默认密码、测试密码、系统密钥
 */
export default function JeepworkLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/jeepwork/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json()) as { success?: boolean; error?: { message?: string } };
      if (!response.ok || !result.success) {
        setError(result.error?.message || "账号或密码错误，请重试。");
        setLoading(false);
        return;
      }
      router.push("/jeepwork");
      router.refresh();
    } catch {
      setError("网络连接失败，请检查网络后重试。");
      setLoading(false);
    }
  }

  return (
    <main className="ui-page flex min-h-dvh items-center justify-center px-4 py-10">
      <section className="ui-surface w-full max-w-md overflow-hidden p-7">
        {/* 顶部标识：明确为平台管理员入口 */}
        <div className="mb-5 flex items-center gap-3 border-b border-[var(--ui-line)] pb-5">
          <span className="grid size-12 place-items-center rounded-[var(--ui-radius-sm)] bg-[var(--ui-brand)] text-lg font-black text-white">
            L
          </span>
          <div className="min-w-0">
            <p className="ui-eyebrow text-[var(--ui-brand)]">Platform Admin</p>
            <h1 className="ui-title mt-1 text-xl">Link168 管理后台</h1>
          </div>
        </div>

        <p className="text-sm font-black text-[var(--ui-ink)]">
          仅限平台管理员登录
        </p>
        <p className="ui-muted mt-1 text-xs leading-5">
          本入口为平台控制平面专用，普通用户请前往
          <Link
            href="/login"
            className="ml-1 font-bold text-[var(--ui-brand)] hover:underline"
          >
            用户登录页
          </Link>
          。
        </p>

        <form onSubmit={onSubmit} className="mt-5 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-[var(--ui-ink)]">管理员邮箱</span>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              placeholder="you@example.com"
              className={adminInputClass}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-[var(--ui-ink)]">密码</span>
            <AdminPasswordInput
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              placeholder="请输入管理员密码"
            />
          </label>

          {error ? (
            <AdminAlertBanner tone="danger" title="登录失败">
              {error}
            </AdminAlertBanner>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="ui-button-primary min-h-11 w-full disabled:opacity-60"
          >
            {loading ? "登录中…" : "登录"}
          </button>
        </form>

        <p className="ui-muted mt-5 text-center text-[11px] leading-5">
          本系统记录登录 IP 与操作日志，所有操作均审计留痕。
        </p>
      </section>
    </main>
  );
}
