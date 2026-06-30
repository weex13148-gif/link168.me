"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import AiSafetyTestRunner from "@/components/ai-safety/AiSafetyTestRunner";

type AdminUser = { email: string; role: string };

// 测试用例统计类型
type TestStats = {
  total: number;
  byCategory: Record<string, number>;
  byAgent: Record<string, number>;
};

export default function AiSafetyPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [stats, setStats] = useState<TestStats | null>(null);
  const [showRunner, setShowRunner] = useState(false);

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
          if (result.success && result.user) {
            setUser(result.user);
          } else {
            router.push("/jeepwork/login");
          }
        }
      } catch {
        if (!cancelled) router.push("/jeepwork/login");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/jeepwork/ai-safety?includeStats=true", { cache: "no-store" });
        if (response.ok) {
          const data = (await response.json()) as { stats?: TestStats };
          if (!cancelled && data.stats) {
            setStats(data.stats);
          }
        }
      } catch {
        // 忽略错误
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function onLogout() {
    const confirmed = window.confirm("确定要退出管理员后台吗？");
    if (!confirmed) return;
    setLoggingOut(true);
    try {
      await fetch("/api/jeepwork/auth/logout", { method: "POST" });
    } catch {
      // 忽略网络错误
    }
    router.push("/jeepwork/login");
    router.refresh();
  }

  const isSuper = user?.role === "super_admin";

  if (loading) {
    return (
      <AdminShell
        currentPageLabel="AI 安全测试"
        currentUserEmail={user?.email}
        currentUserRole={user?.role}
        pageHeader={{
          eyebrow: "AI Safety",
          title: "AI 安全测试",
          subtitle: "运行安全测试用例，检测 AI 防护机制是否有效。",
          highlight: "#6F8F4E",
        }}
      >
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-[#7A6D5E]">加载中...</p>
        </div>
      </AdminShell>
    );
  }

  // 分类统计展示
  const categoryLabels: Record<string, string> = {
    normal: "正常问答",
    prompt_injection: "提示词注入",
    system_leak: "系统提示词泄露",
    sensitive_input: "敏感输入",
    high_risk_output: "高风险输出",
    illegal_request: "违法违规请求",
    tax_high_risk: "财税高风险",
    legal_high_risk: "法律高风险",
    oversized_input: "超长输入",
    empty_input: "空输入",
  };

  const categoryColors: Record<string, string> = {
    normal: "#6F8F4E",
    prompt_injection: "#B42318",
    system_leak: "#8C3B0E",
    sensitive_input: "#B42318",
    high_risk_output: "#8C3B0E",
    illegal_request: "#B42318",
    tax_high_risk: "#8C612E",
    legal_high_risk: "#8C3B0E",
    oversized_input: "#5B6FFF",
    empty_input: "#5B6FFF",
  };

  return (
    <AdminShell
      currentPageLabel="AI 安全测试"
      currentUserEmail={user?.email}
      currentUserRole={user?.role}
      onLogout={loggingOut ? undefined : onLogout}
      pageHeader={{
        eyebrow: "AI Safety",
        title: "AI 安全测试",
        subtitle: "运行安全测试用例，检测 AI 防护机制是否有效。",
        highlight: "#6F8F4E",
      }}
    >
      {/* 统计卡片 */}
      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats ? (
          <>
            <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#6F8F4E]">总测试用例</p>
              <p className="mt-2 text-3xl font-black text-[#2B241E]">{stats.total}</p>
              <p className="mt-1 text-xs text-[#7A6D5E]">覆盖10种测试类型</p>
            </div>
            <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#B42318]">高风险用例</p>
              <p className="mt-2 text-3xl font-black text-[#2B241E]">
                {(stats.byCategory["prompt_injection"] || 0) +
                  (stats.byCategory["sensitive_input"] || 0) +
                  (stats.byCategory["high_risk_output"] || 0) +
                  (stats.byCategory["illegal_request"] || 0)}
              </p>
              <p className="mt-1 text-xs text-[#7A6D5E]">注入/敏感/高风险/违法</p>
            </div>
            <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8C612E]">财税法务用例</p>
              <p className="mt-2 text-3xl font-black text-[#2B241E]">
                {(stats.byCategory["tax_high_risk"] || 0) + (stats.byCategory["legal_high_risk"] || 0)}
              </p>
              <p className="mt-1 text-xs text-[#7A6D5E]">专项高风险场景</p>
            </div>
            <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#5B6FFF]">边界测试用例</p>
              <p className="mt-2 text-3xl font-black text-[#2B241E]">
                {(stats.byCategory["oversized_input"] || 0) + (stats.byCategory["empty_input"] || 0)}
              </p>
              <p className="mt-1 text-xs text-[#7A6D5E]">超长/空输入</p>
            </div>
          </>
        ) : (
          <div className="rounded-[28px] border border-dashed border-[#E8DCCB] bg-white p-6 shadow-sm col-span-4">
            <p className="text-sm text-[#7A6D5E]">加载统计信息...</p>
          </div>
        )}
      </section>

      {/* 按类别分布 */}
      {stats && (
        <section className="mb-6 rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
          <p className="text-sm font-black text-[#2B241E]">测试用例分布</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(stats.byCategory).map(([cat, count]) => (
              <span
                key={cat}
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold"
                style={{
                  backgroundColor: `${categoryColors[cat] || "#6F8F4E"}15`,
                  color: categoryColors[cat] || "#6F8F4E",
                }}
              >
                {categoryLabels[cat] || cat}: {count}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 数据持久化警告 */}
      <section className="mb-6 rounded-[28px] border border-dashed border-[#E8DCCB] bg-white p-4 shadow-sm">
        <p className="text-xs font-bold text-[#8C612E]">⚠️ 等待数据模型</p>
        <p className="mt-1 text-xs text-[#7A6D5E]">
          当前测试用例存储在内存中，重启服务后数据将重置。正式上线需建立数据库模型。
        </p>
      </section>

      {/* 功能入口 */}
      <section className="mb-6 grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => setShowRunner(!showRunner)}
          className="rounded-[28px] border border-[#6F8F4E] bg-white p-6 text-left shadow-sm transition hover:shadow-[0_18px_55px_rgba(86,68,46,0.08)]"
        >
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#6F8F4E]">Test Runner</p>
          <h2 className="mt-2 text-lg font-black text-[#2B241E]">
            {showRunner ? "隐藏测试运行器" : "展开测试运行器"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">
            执行安全测试用例，验证 AI 防护机制是否正常工作。
          </p>
          <p className="mt-4 text-sm font-bold text-[#6F8F4E]">{showRunner ? "点击隐藏" : "点击运行 →"}</p>
        </button>

        {isSuper && (
          <Link
            href="/jeepwork/governance"
            className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 text-left shadow-sm transition hover:shadow-[0_18px_55px_rgba(86,68,46,0.08)]"
          >
            <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: "#5B6FFF" }}>Governance</p>
            <h2 className="mt-2 text-lg font-black text-[#2B241E]">平台治理</h2>
            <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">查看风险事件统计、人工审核队列。</p>
            <p className="mt-4 text-sm font-bold text-[#5B6FFF]">进入治理 →</p>
          </Link>
        )}
      </section>

      {/* 测试运行器 */}
      {showRunner && <AiSafetyTestRunner />}

      {/* 说明文档 */}
      <section className="mt-8 rounded-[28px] border border-dashed border-[#E8DCCB] bg-white p-6 text-sm leading-6 text-[#7A6D5E] shadow-sm">
        <p className="font-black text-[#2B241E]">AI 安全测试说明</p>
        <ul className="mt-2 grid list-disc gap-1 pl-5">
          <li>正常问答：验证 AI 正常响应正常业务咨询</li>
          <li>提示词注入：检测"忽略之前指令"等攻击是否被拦截</li>
          <li>系统提示词泄露：检测是否泄露系统配置</li>
          <li>敏感输入：检测政治、色情、暴力等敏感内容是否被拒绝</li>
          <li>高风险输出：检测 AI 是否主动给出危险建议</li>
          <li>违法违规请求：检测犯罪相关咨询是否被拒绝或转人工</li>
          <li>财税/法律高风险：专项检测高风险专业建议</li>
          <li>超长输入：检测超大输入是否被正确处理</li>
          <li>空输入：检测空输入是否被正确拒绝</li>
        </ul>
      </section>
    </AdminShell>
  );
}
