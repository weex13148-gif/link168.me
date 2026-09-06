"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export const buttonClass = "inline-flex min-h-12 items-center justify-center rounded-[10px] bg-[#0B4DD8] px-4 py-2 text-sm font-bold text-white hover:bg-[#083EA9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4DD8] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";
export const secondaryClass = "inline-flex min-h-12 items-center justify-center rounded-[10px] border border-[#DDD6CC] bg-white px-4 py-2 text-sm font-bold text-[#151515] hover:bg-[#F7F2E9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4DD8] disabled:opacity-60";
export const inputClass = "mt-2 min-h-12 w-full rounded-[10px] border border-[#BEB5A9] bg-white px-3 py-2 text-base text-[#151515] focus:outline-none focus:ring-2 focus:ring-[#0B4DD8]";
export const cardClass = "rounded-[20px] border border-[#DDD6CC] bg-[#FFFDF9] p-5 sm:p-6";
export const roleLabel = (role: string) => ({ owner: "所有者", admin: "管理员", member: "成员" })[role] ?? "成员";
export const statusLabel = (status: string) => ({ active: "正常", pending: "待接受", valid: "待接受", expired: "已过期", revoked: "已撤销", used: "已使用", accepted: "已接受", disabled: "已停用", removed: "已移除" })[status] ?? "不可用";

export async function teamRequest<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  let response: Response;
  let result;
  try {
    response = await fetch(path, { method, cache: "no-store", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    result = await response.json();
  } catch {
    throw new Error("暂时无法连接服务，请检查网络后重试。如果刚才提交了操作，请先刷新确认结果。");
  }
  if (!response.ok || !result.success) {
    const fallback: Record<string, string> = { UNAUTHORIZED: "请先登录后继续。", FORBIDDEN: "你没有执行此操作的权限。", NOT_FOUND: "团队或邀请不存在，或已不可用。", INTERNAL_ERROR: "暂时无法完成操作，请稍后重试。" };
    const message = fallback[result.code] ?? (typeof result.error === "string" && !/Current|workspace|prisma|SQL|identity/i.test(result.error) ? result.error : "操作未完成，请检查填写内容或稍后重试。");
    throw new Error(message);
  }
  return result as T;
}

export function useTeamData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    teamRequest<T>(path).then((value) => { if (active) setData(value); }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "暂时无法加载，请重试。"); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path, revision]);
  return { data, error, loading, reload };
}

export function TeamShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <main className="min-h-dvh bg-[#F7F2E9] px-4 py-8 text-[#151515] sm:px-6"><div className="mx-auto max-w-[960px]"><Link href="/console/pages" className="inline-flex min-h-11 items-center text-sm font-bold text-[#0B4DD8] underline underline-offset-4">返回我的页面</Link><header className="mb-6 mt-3"><h1 className="break-words text-[28px] font-bold leading-tight sm:text-[32px]">{title}</h1><p className="mt-3 leading-7 text-[#5E5A54]">{description}</p></header>{children}</div></main>;
}

export function Feedback({ error, message }: { error?: string; message?: string }) {
  if (error) return <p role="alert" className="my-4 rounded-[10px] bg-[#FDECEA] p-4 text-sm leading-6 text-[#B42318]">{error}</p>;
  if (message) return <p role="status" className="my-4 rounded-[10px] bg-[#E5F4EC] p-4 text-sm leading-6 text-[#168A5B]">{message}</p>;
  return null;
}

export function LoadState({ loading, error, reload }: { loading: boolean; error: string; reload: () => void }) {
  if (loading) return <div className={cardClass} role="status" aria-live="polite">正在加载团队信息…</div>;
  if (error) return <div className={cardClass}><Feedback error={error} /><button type="button" className={secondaryClass} onClick={reload}>重新加载</button></div>;
  return null;
}
