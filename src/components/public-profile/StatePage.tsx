"use client";

import Link from "next/link";

interface StatePageProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  statusCode?: number;
}

export function StatePage({ title, description, action, icon, statusCode }: StatePageProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-10">
      <section
        className="w-full rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8] p-8 text-center shadow-sm"
        role="alert"
        aria-live="polite"
      >
        {icon ? (
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-[#F2E7D8]">
            {icon}
          </div>
        ) : null}
        {statusCode ? (
          <p className="text-sm font-black text-[#7A6D5E]" aria-label={`状态码 ${statusCode}`}>
            {statusCode}
          </p>
        ) : null}
        <h1 className="text-2xl font-black text-[#2B241E]">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-[#7A6D5E]">{description}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </section>

      <a
        href={process.env.NEXT_PUBLIC_APP_URL || "https://link168.me"}
        className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#E8DCCB] bg-white px-4 py-2 text-xs font-black text-[#4F6D37] shadow-sm"
        aria-label="访问 Link168 官网"
      >
        <span className="grid size-6 place-items-center rounded-lg bg-[#6F8F4E] text-[10px] text-white">
          L
        </span>
        由 Link168 提供
      </a>
    </main>
  );
}

export function NotFoundState({ username }: { username?: string }) {
  return (
    <StatePage
      title="页面未找到"
      description={
        username
          ? `抱歉，@${username} 的公开主页不存在或已被删除。请检查链接是否正确，或联系主页所有者确认。`
          : "抱歉，您访问的页面不存在或已被删除。请检查链接是否正确。"
      }
      statusCode={404}
      action={
        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#6F8F4E] px-6 text-sm font-black text-white"
          >
            返回首页
          </Link>
          <Link
            href="/register"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#E8DCCB] bg-white px-6 text-sm font-black text-[#2B241E]"
          >
            免费创建我的主页
          </Link>
        </div>
      }
    />
  );
}

export function NotPublishedState() {
  return (
    <StatePage
      title="该主页暂未公开"
      description="主页所有者尚未公开此页面。您可以创建自己的 Link168 主页，展示联系方式、产品服务和社交链接。"
      action={
        <div className="flex flex-col gap-3">
          <Link
            href="/register"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#6F8F4E] px-6 text-sm font-black text-white"
          >
            免费创建我的主页
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#E8DCCB] bg-white px-6 text-sm font-black text-[#2B241E]"
          >
            了解 Link168
          </Link>
        </div>
      }
    />
  );
}

export function FrozenState({ reason }: { reason?: string }) {
  return (
    <StatePage
      title="该主页暂不可访问"
      description={
        reason || "该主页当前处于限制状态，暂时无法访问。如有疑问，请联系平台客服。"
      }
      action={
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#6F8F4E] px-6 text-sm font-black text-white"
        >
          返回首页
        </Link>
      }
    />
  );
}

export function BannedState() {
  return (
    <StatePage
      title="该账号已被封禁"
      description="该账号因违反平台规则，公开主页已停止展示。如有异议，请联系平台客服申诉。"
      action={
        <Link
          href="/report"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#6F8F4E] px-6 text-sm font-black text-white"
        >
          举报违规内容
        </Link>
      }
    />
  );
}
