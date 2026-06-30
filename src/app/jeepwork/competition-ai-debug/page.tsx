"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { AI_ASSISTANTS, type AiAssistantKey } from "@/lib/app-config-values";
import { useRouter } from "next/navigation";

type AdminUser = { email: string; role: string };

type Draft = {
  id: string;
  assistant: AiAssistantKey;
  title: string;
  systemPrompt: string;
  welcomeText: string;
  suggestedQuestions: string[];
  published: boolean;
  version: string;
  authorEmail: string;
  createdAt: string;
  updatedAt: string;
};

const ASSISTANT_LABELS: Record<AiAssistantKey, string> = {
  tax: "财税助理",
  legal: "法务助理",
  market: "市场调研助理",
  design: "设计助理",
  social: "社媒运营助理",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function DebugClient() {
  const [assistant, setAssistant] = useState<AiAssistantKey>("tax");
  const [modelName, setModelName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [question, setQuestion] = useState("");
  const [saveLog, setSaveLog] = useState(true);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftVersion, setDraftVersion] = useState("0.1.0");
  const [draftWelcome, setDraftWelcome] = useState("");
  const [draftQuestions, setDraftQuestions] = useState("");
  const [response, setResponse] = useState("");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [history, setHistory] = useState<
    Array<{ id: string; assistant: string; question: string; rawResponse: string; latencyMs: number; success: boolean; errorCode: string | null; createdAt: string }>
  >([]);

  useEffect(() => {
    void loadDrafts();
    // 拉取历史仅前端可见内存，列表仅在发送时刷新
  }, [assistant]);

  async function loadDrafts() {
    try {
      const res = await fetch(`/api/jeepwork/competition-ai-debug?assistant=${assistant}`, { cache: "no-store" });
      const json = (await res.json()) as { success?: boolean; data?: { drafts: Draft[] } };
      if (json.success && json.data) setDrafts(json.data.drafts);
    } catch {
      // ignore
    }
  }

  const activeDraft = useMemo(() => drafts.find((d) => d.published) || null, [drafts]);

  function applyDraft(d: Draft) {
    setSystemPrompt(d.systemPrompt);
    setDraftTitle(d.title);
    setDraftVersion(d.version);
    setDraftWelcome(d.welcomeText);
    setDraftQuestions(d.suggestedQuestions.join("\n"));
  }

  async function send() {
    if (!systemPrompt.trim() || !question.trim()) {
      setError("系统提示词与测试问题不能为空");
      return;
    }
    setBusy(true);
    setError(null);
    setResponse("");
    setLatencyMs(null);
    setMessage("");
    try {
      const res = await fetch("/api/jeepwork/competition-ai-debug", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "test",
          assistant,
          systemPrompt,
          question,
          modelName: modelName || undefined,
          configVersion: draftVersion,
          saveLog,
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { response: string; latencyMs: number; modelName?: string; configVersion?: string; logId?: string };
        error?: { code?: string; message?: string };
      };
      if (!res.ok || !json.success) {
        setError(json.error?.message || "AI 调用失败");
        return;
      }
      setResponse(json.data?.response || "");
      setLatencyMs(json.data?.latencyMs || 0);
      setHistory((h) => [
        {
          id: json.data?.logId || crypto.randomUUID(),
          assistant,
          question,
          rawResponse: json.data?.response || "",
          latencyMs: json.data?.latencyMs || 0,
          success: true,
          errorCode: null,
          createdAt: new Date().toISOString(),
        },
        ...h,
      ].slice(0, 30));
    } catch (e) {
      setError("网络异常");
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!systemPrompt.trim()) {
      setError("系统提示词不能为空");
      return;
    }
    setBusy(true);
    setMessage("");
    setIsError(false);
    try {
      const res = await fetch("/api/jeepwork/competition-ai-debug", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "save-draft",
          assistant,
          title: draftTitle || `${ASSISTANT_LABELS[assistant]} 草稿`,
          systemPrompt,
          welcomeText: draftWelcome,
          suggestedQuestions: draftQuestions.split("\n").map((s) => s.trim()).filter(Boolean),
          version: draftVersion,
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: { message?: string } };
      if (!res.ok || !json.success) {
        setMessage(json.error?.message || "保存草稿失败");
        setIsError(true);
        return;
      }
      setMessage("草稿已保存（未发布）");
      await loadDrafts();
    } catch {
      setMessage("网络异常");
      setIsError(true);
    } finally {
      setBusy(false);
    }
  }

  async function publishDraft(draftId: string) {
    setBusy(true);
    setMessage("");
    setIsError(false);
    try {
      const res = await fetch("/api/jeepwork/competition-ai-debug", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "publish-draft", draftId }),
      });
      const json = (await res.json()) as { success?: boolean; error?: { message?: string } };
      if (!res.ok || !json.success) {
        setMessage(json.error?.message || "发布失败");
        setIsError(true);
        return;
      }
      setMessage("已发布为比赛演示提示词（同一助手其他草稿自动取消发布）");
      await loadDrafts();
    } catch {
      setMessage("网络异常");
      setIsError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-[#2B241E]">AI 调试台</h2>
            <p className="mt-1 text-sm leading-6 text-[#7A6D5E]">
              调试环境 / 比赛演示 / 正式用户 三套数据互不混用。AI Key 不会返回前端，仅服务端调用阿里百炼。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(AI_ASSISTANTS) as AiAssistantKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setAssistant(key)}
                className={`min-h-10 rounded-2xl px-4 text-sm font-black transition-colors ${
                  key === assistant ? "bg-[#315F8C] text-white" : "border border-[#E8DCCB] bg-white text-[#2B241E]"
                }`}
              >
                {ASSISTANT_LABELS[key]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <section className="grid gap-4 rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
          <h3 className="text-lg font-black text-[#2B241E]">测试运行</h3>
          <label className="grid gap-1 text-xs font-black text-[#2B241E]">
            模型（可覆盖）
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="留空使用 AI 配置中的模型"
              className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 text-sm outline-none focus:border-[#315F8C]"
            />
          </label>
          <label className="grid gap-1 text-xs font-black text-[#2B241E]">
            系统提示词
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={8}
              className="rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 py-2 text-sm outline-none focus:border-[#315F8C]"
            />
          </label>
          <label className="grid gap-1 text-xs font-black text-[#2B241E]">
            测试问题
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              className="rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 py-2 text-sm outline-none focus:border-[#315F8C]"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-black text-[#2B241E]">
            <input type="checkbox" checked={saveLog} onChange={(e) => setSaveLog(e.target.checked)} className="size-4 accent-[#315F8C]" />
            保存本次调试记录
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={send} disabled={busy} className="min-h-11 rounded-2xl bg-[#315F8C] px-5 text-sm font-black text-white disabled:opacity-60">
              {busy ? "调用中..." : "运行测试"}
            </button>
            <button type="button" onClick={() => { setResponse(""); setLatencyMs(null); setError(null); }} className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-5 text-sm font-black text-[#2B241E]">
              清空响应
            </button>
          </div>
          {error ? <p className="rounded-2xl border border-[#B42318] bg-[#FFEFEF] p-3 text-sm font-black text-[#B42318]">{error}</p> : null}
          {response ? (
            <div className="rounded-2xl border border-[#E8DCCB] bg-[#F8F5EF] p-4">
              <div className="mb-2 flex items-center justify-between text-xs text-[#7A6D5E]">
                <span className="font-black">原始响应</span>
                {latencyMs !== null ? <span>耗时 {latencyMs} ms</span> : null}
              </div>
              <pre className="whitespace-pre-wrap text-sm leading-6 text-[#2B241E]">{response}</pre>
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
          <h3 className="text-lg font-black text-[#2B241E]">保存为草稿 / 发布</h3>
          <p className="text-xs leading-5 text-[#7A6D5E]">发布的提示词会被比赛展示页的 AI 演示窗口读取；调试与演示数据互不混用。</p>
          <label className="grid gap-1 text-xs font-black text-[#2B241E]">
            草稿标题
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="如 V0.1 财税助理 v2"
              className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 text-sm outline-none focus:border-[#315F8C]"
            />
          </label>
          <label className="grid gap-1 text-xs font-black text-[#2B241E]">
            版本号
            <input
              type="text"
              value={draftVersion}
              onChange={(e) => setDraftVersion(e.target.value)}
              className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 text-sm outline-none focus:border-[#315F8C]"
            />
          </label>
          <label className="grid gap-1 text-xs font-black text-[#2B241E]">
            欢迎语
            <textarea
              value={draftWelcome}
              onChange={(e) => setDraftWelcome(e.target.value)}
              rows={2}
              className="rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 py-2 text-sm outline-none focus:border-[#315F8C]"
            />
          </label>
          <label className="grid gap-1 text-xs font-black text-[#2B241E]">
            推荐问题（每行一个）
            <textarea
              value={draftQuestions}
              onChange={(e) => setDraftQuestions(e.target.value)}
              rows={3}
              className="rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 py-2 text-sm outline-none focus:border-[#315F8C]"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={saveDraft} disabled={busy} className="min-h-11 rounded-2xl bg-[#6F8F4E] px-5 text-sm font-black text-white disabled:opacity-60">
              {busy ? "保存中..." : "保存草稿"}
            </button>
            {activeDraft ? (
              <span className="rounded-full bg-[#E5F3D5] px-3 py-1 text-xs font-black text-[#3D6B22]">
                当前已发布：{activeDraft.title} · v{activeDraft.version}
              </span>
            ) : (
              <span className="rounded-full bg-[#F2EDE3] px-3 py-1 text-xs font-black text-[#7A6D5E]">尚未发布</span>
            )}
          </div>

          {message ? <p className={`text-sm font-black ${isError ? "text-[#B42318]" : "text-[#315F8C]"}`}>{message}</p> : null}

          <div className="grid gap-2">
            <p className="text-xs font-black text-[#2B241E]">历史草稿（{drafts.length}）</p>
            <div className="max-h-60 overflow-y-auto rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8]">
              {drafts.length === 0 ? (
                <p className="px-3 py-3 text-xs text-[#7A6D5E]">暂无草稿</p>
              ) : (
                drafts.map((d) => (
                  <div key={d.id} className="flex items-center justify-between border-b border-[#F1E9DE] px-3 py-2 text-xs last:border-b-0">
                    <div>
                      <p className="font-black text-[#2B241E]">
                        {d.title} · v{d.version}
                        {d.published ? <span className="ml-2 rounded-full bg-[#E5F3D5] px-2 py-0.5 text-[10px] text-[#3D6B22]">已发布</span> : null}
                      </p>
                      <p className="text-[10px] text-[#7A6D5E]">{formatDate(d.updatedAt)} · {d.authorEmail}</p>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => applyDraft(d)} className="rounded-2xl border border-[#E8DCCB] px-2 py-1 text-[11px] font-black text-[#2B241E]">
                        载入
                      </button>
                      <button type="button" onClick={() => publishDraft(d.id)} disabled={d.published} className="rounded-2xl bg-[#315F8C] px-2 py-1 text-[11px] font-black text-white disabled:opacity-60">
                        发布
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
        <h3 className="text-lg font-black text-[#2B241E]">本次会话最近 30 次调试</h3>
        <p className="mt-1 text-xs leading-5 text-[#7A6D5E]">仅前端会话内可见，刷新后清空；正式调试记录请在审计日志中查看。</p>
        <div className="mt-4 grid gap-3">
          {history.length === 0 ? (
            <p className="text-xs text-[#7A6D5E]">尚未运行</p>
          ) : (
            history.map((h) => (
              <div key={h.id} className="rounded-2xl border border-[#E8DCCB] bg-[#F8F5EF] p-3 text-xs">
                <p className="font-black text-[#315F8C]">{ASSISTANT_LABELS[h.assistant as AiAssistantKey] || h.assistant} · {h.latencyMs} ms</p>
                <p className="mt-1 text-[#2B241E]">问：{h.question}</p>
                <p className="mt-1 text-[#2B241E]">答：{h.rawResponse.slice(0, 200)}{h.rawResponse.length > 200 ? "..." : ""}</p>
                {h.errorCode ? <p className="mt-1 text-[#B42318]">错误：{h.errorCode}</p> : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default function CompetitionAIDebugPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/jeepwork/auth/me", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) router.push("/jeepwork/login");
          return;
        }
        const json = (await res.json()) as { success?: boolean; user?: AdminUser };
        if (cancelled) return;
        if (json.success && json.user?.role === "super_admin") {
          setUser(json.user);
        } else {
          router.push("/jeepwork");
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

  return (
    <AdminShell
      currentPageLabel="比赛 AI 调试"
      currentUserEmail={user?.email}
      onLogout={loggingOut ? undefined : onLogout}
      pageHeader={{
        eyebrow: "Competition AI Debug",
        title: "比赛 AI 调试台",
        subtitle: "仅 super_admin 可访问。调试 / 演示 / 正式用户三套数据互不混用。",
        highlight: "#315F8C",
      }}
    >
      <DebugClient />
    </AdminShell>
  );
}
