"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AI_ASSISTANT_TITLES,
  AI_ASSISTANTS,
  type AiAssistantTitle,
} from "@/lib/ai/assistants";
import {
  SHOWCASE_V2_SECTION_LABELS,
  SHOWCASE_V2_SECTIONS,
  type ShowcaseV2Bullet,
  type ShowcaseV2Stat,
  type ShowcaseV2SectionKey,
} from "@/lib/showcase-v2-shared";
import { formatFileSize, formatDate as sharedFormatDate } from "@/lib/format";

// 内部使用的助手 key（与持久化层一致："tax" | "legal" | ...）
type AssistantKey = keyof typeof AI_ASSISTANT_TITLES;
const ASSISTANT_KEYS = Object.keys(AI_ASSISTANT_TITLES) as AssistantKey[];

type SectionContent = {
  id: string;
  sectionKey: ShowcaseV2SectionKey;
  eyebrow: string;
  title: string;
  body: string;
  bullets: ShowcaseV2Bullet[];
  stats: ShowcaseV2Stat[];
  ctaText: string | null;
  ctaUrl: string | null;
  updatedAt: string;
  updatedBy: string | null;
};

type Sequence = {
  id: string;
  sectionKey: ShowcaseV2SectionKey;
  orderIndex: number;
  visible: boolean;
  animation: boolean;
  theme: string;
  dwellSec: number;
  allowSwipe: boolean;
};

type AIConfig = {
  enabled: boolean;
  allowFreeInput: boolean;
  saveRecord: boolean;
  perVisitorLimit: number;
  dailyTotalLimit: number;
  maxOutputLength: number;
  timeoutMs: number;
  modelName: string;
  baseUrl: string;
  apiKeyConfigured: boolean;
  welcomeByAssistant: Record<string, string>;
  suggestedQuestionsByAssistant: Record<string, string[]>;
  assistantEnabled: Record<string, boolean>;
  configVersion: string;
  lastUpdatedAt: string | null;
  lastUpdatedBy: string | null;
};

type StatPayload = {
  totalVisits: number;
  uniqueVisitors: number;
  lastVisitedAt: string | null;
  topSections: Array<{ sectionKey: string; count: number }>;
  demoCalls: { total: number; success: number; failed: number; avgLatencyMs: number };
  fileDownloads: { total: number };
};

type ConfigPayload = {
  enabled: boolean;
  hasPassword: boolean;
  updatedAt: string | null;
  sections: Record<ShowcaseV2SectionKey, boolean>;
  sectionLabels: Record<ShowcaseV2SectionKey, string>;
};

type Props = {
  initialConfig: ConfigPayload;
  initialLogs: Array<{
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
  }>;
};

type TabKey = "config" | "content" | "sequence" | "ai" | "files" | "stats" | "ip";

type CompetitionFile = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  purpose: string;
  description: string | null;
  isCurrentMain: boolean;
  uploadedByEmail: string;
  createdAt: string;
};

type FileApiPayload = { files: CompetitionFile[] };
type FileApiSinglePayload = { id: string; originalName: string; mimeType: string; sizeBytes: number; purpose: string; description: string | null; isCurrentMain: boolean; uploadedByEmail: string; createdAt: string; message?: string };

const ASSISTANT_KEYS_LOCAL = Object.keys(AI_ASSISTANT_TITLES) as Array<keyof typeof AI_ASSISTANT_TITLES>;
const ASSISTANT_LABELS: Record<keyof typeof AI_ASSISTANT_TITLES, string> = {
  tax: "财税助理",
  legal: "法务助理",
  market: "市场调研助理",
  design: "设计助理",
  social: "社媒运营助理",
};

function formatDate(value: string) {
  return sharedFormatDate(value);
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("zh-CN");
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.includes("image/")) return "🖼️";
  if (mimeType.includes("video/")) return "🎬";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "📊";
  if (mimeType.includes("document") || mimeType.includes("word")) return "📝";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "📈";
  return "📁";
}

function FilesTab({ onMessage }: { onMessage: (msg: string, isError?: boolean) => void }) {
  const [files, setFiles] = useState<CompetitionFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [replacingFile, setReplacingFile] = useState<CompetitionFile | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [settingMain, setSettingMain] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState<{ id: string; value: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  async function loadFiles() {
    try {
      const res = await fetch("/api/jeepwork/competition-files", { cache: "no-store" });
      const json = (await res.json()) as { success?: boolean; data?: FileApiPayload; error?: { message?: string } };
      if (!res.ok || !json.success || !json.data) {
        setMessage(json.error?.message || "加载失败");
        setIsError(true);
        return;
      }
      setFiles(json.data.files);
    } catch {
      setMessage("网络异常");
      setIsError(true);
    }
  }

  useEffect(() => {
    void loadFiles();
  }, []);

  async function handleUpload(purpose: string) {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
    const input = fileInputRef.current;
    if (!input) return;
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploading(true);
      setMessage("");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", purpose);
      try {
        const res = await fetch("/api/jeepwork/competition-files", {
          method: "POST",
          cache: "no-store",
          body: formData,
        });
        const json = (await res.json()) as { success?: boolean; data?: FileApiSinglePayload; error?: { message?: string } };
        if (!res.ok || !json.success || !json.data) {
          setMessage(json.error?.message || "上传失败");
          setIsError(true);
          setUploading(false);
          return;
        }
        setMessage("文件上传成功");
        setIsError(false);
        await loadFiles();
      } catch {
        setMessage("网络异常");
        setIsError(true);
      } finally {
        setUploading(false);
        if (input) input.value = "";
      }
    };
  }

  async function handleDelete(id: string) {
    if (!confirm("确认删除？删除后不可恢复。")) return;
    setDeletingId(id);
    setMessage("");
    try {
      const res = await fetch(`/api/jeepwork/competition-files/${id}`, { method: "DELETE", cache: "no-store" });
      const json = (await res.json()) as { success?: boolean; error?: { message?: string } };
      if (!res.ok || !json.success) {
        setMessage(json.error?.message || "删除失败");
        setIsError(true);
        return;
      }
      setMessage("文件已删除");
      setIsError(false);
      await loadFiles();
    } catch {
      setMessage("网络异常");
      setIsError(true);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleReplace() {
    if (!replacingFile) return;
    const input = replaceInputRef.current;
    if (!input) return;
    input.click();
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("file", file);
      setReplacing(true);
      setMessage("");
      try {
        const res = await fetch(`/api/jeepwork/competition-files/${replacingFile.id}/replace`, {
          method: "POST",
          cache: "no-store",
          body: formData,
        });
        const json = (await res.json()) as { success?: boolean; data?: FileApiSinglePayload; error?: { message?: string } };
        if (!res.ok || !json.success || !json.data) {
          setMessage(json.error?.message || "替换失败");
          setIsError(true);
          setReplacing(false);
          return;
        }
        setMessage("文件已替换成功");
        setIsError(false);
        setReplacingFile(null);
        await loadFiles();
      } catch {
        setMessage("网络异常");
        setIsError(true);
      } finally {
        setReplacing(false);
        if (input) input.value = "";
      }
    };
  }

  async function handleSetMain(id: string) {
    setSettingMain(id);
    setMessage("");
    try {
      const res = await fetch(`/api/jeepwork/competition-files/${id}/main`, { method: "POST", cache: "no-store" });
      const json = (await res.json()) as { success?: boolean; error?: { message?: string } };
      if (!res.ok || !json.success) {
        setMessage(json.error?.message || "设置失败");
        setIsError(true);
        return;
      }
      setMessage("已设为主文件");
      setIsError(false);
      await loadFiles();
    } catch {
      setMessage("网络异常");
      setIsError(true);
    } finally {
      setSettingMain(null);
    }
  }

  async function handleDownload(id: string, originalName: string) {
    setMessage("");
    try {
      const res = await fetch(`/api/jeepwork/competition-files/${id}/download`, { cache: "no-store" });
      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } };
        setMessage(json.error?.message || "下载失败");
        setIsError(true);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setMessage("网络异常");
      setIsError(true);
    }
  }

  async function handleUpdateDesc(id: string) {
    if (!editDesc) return;
    try {
      const res = await fetch(`/api/jeepwork/competition-files/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: editDesc.value }),
        cache: "no-store",
      });
      const json = (await res.json()) as { success?: boolean; error?: { message?: string } };
      if (!res.ok || !json.success) {
        setMessage(json.error?.message || "更新失败");
        setIsError(true);
        return;
      }
      setEditDesc(null);
      setMessage("说明已更新");
      setIsError(false);
      await loadFiles();
    } catch {
      setMessage("网络异常");
      setIsError(true);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-[#2B241E]">比赛文件管理</h2>
            <p className="mt-1 text-sm leading-6 text-[#7A6D5E]">上传 / 下载 / 替换 / 删除 / 设主文件。文件不在 public/ 下，通过 API 受保护下载。</p>
          </div>
          <span className="rounded-full bg-[#F2EDE3] px-3 py-1 text-xs font-black text-[#7A6D5E]">安全上传 · 单文件 50MB 限制</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void handleUpload("competition_ppt")} disabled={uploading} className="min-h-10 rounded-2xl bg-[#315F8C] px-4 text-sm font-black text-white disabled:opacity-60">
          {uploading ? "上传中..." : "上传比赛 PPT"}
        </button>
        <button type="button" onClick={() => void handleUpload("project_pdf")} disabled={uploading} className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-black text-[#2B241E] disabled:opacity-60">
          上传项目 PDF
        </button>
        <button type="button" onClick={() => void handleUpload("product_screenshot")} disabled={uploading} className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-black text-[#2B241E] disabled:opacity-60">
          上传产品截图
        </button>
        <button type="button" onClick={() => void handleUpload("judge_doc")} disabled={uploading} className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-black text-[#2B241E] disabled:opacity-60">
          上传评委文档
        </button>
        <button type="button" onClick={() => void handleUpload("demo_video")} disabled={uploading} className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-black text-[#2B241E] disabled:opacity-60">
          上传演示视频
        </button>
        <button type="button" onClick={() => void handleUpload("backup")} disabled={uploading} className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-black text-[#2B241E] disabled:opacity-60">
          上传其他文件
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pptx,.pdf,.docx,.xlsx,.png,.jpg,.jpeg,.webp,.mp4,.zip"
      />
      <input
        ref={replaceInputRef}
        type="file"
        className="hidden"
        accept=".pptx,.pdf,.docx,.xlsx,.png,.jpg,.jpeg,.webp,.mp4,.zip"
      />

      {message ? <p className={`text-sm font-black ${isError ? "text-[#B42318]" : "text-[#315F8C]"}`}>{message}</p> : null}

      <div className="overflow-x-auto rounded-[28px] border border-[#E8DCCB] bg-white shadow-sm">
        <table className="min-w-[900px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#E8DCCB] text-xs font-black uppercase tracking-widest text-[#7A6D5E]">
              <th className="px-4 py-3">文件</th>
              <th className="px-4 py-3">类型</th>
              <th className="px-4 py-3">大小</th>
              <th className="px-4 py-3">用途</th>
              <th className="px-4 py-3">说明</th>
              <th className="px-4 py-3">上传者</th>
              <th className="px-4 py-3">时间</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr key={file.id} className="border-b border-[#F1E9DE] align-top">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{FileIcon({ mimeType: file.mimeType })}</span>
                    <div>
                      <p className="max-w-[200px] truncate font-black text-[#2B241E]">{file.originalName}</p>
                      {file.isCurrentMain ? <span className="text-[10px] font-black text-[#315F8C]">⭐ 主文件</span> : null}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-[#7A6D5E]">{file.mimeType}</td>
                <td className="px-4 py-3 text-[#7A6D5E]">{formatFileSize(file.sizeBytes)}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-[#F2EDE3] px-2 py-0.5 text-xs text-[#7A6D5E]">{file.purpose}</span>
                </td>
                <td className="px-4 py-3">
                  {editDesc?.id === file.id ? (
                    <div className="flex flex-col gap-1">
                      <input
                        value={editDesc.value}
                        onChange={(e) => setEditDesc({ ...editDesc, value: e.target.value })}
                        className="min-h-8 rounded-lg border border-[#E8DCCB] bg-[#FFFDF8] px-2 text-xs outline-none focus:border-[#315F8C]"
                      />
                      <div className="flex gap-1">
                        <button type="button" onClick={() => void handleUpdateDesc(file.id)} className="rounded bg-[#315F8C] px-2 py-0.5 text-xs font-black text-white">保存</button>
                        <button type="button" onClick={() => setEditDesc(null)} className="rounded border border-[#E8DCCB] px-2 py-0.5 text-xs">取消</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setEditDesc({ id: file.id, value: file.description || "" })} className="max-w-[160px] truncate text-left text-xs text-[#7A6D5E] hover:text-[#315F8C]">
                      {file.description || "点击添加说明"}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-[#7A6D5E]">{file.uploadedByEmail}</td>
                <td className="px-4 py-3 text-xs text-[#7A6D5E]">{formatDate(file.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <button type="button" onClick={() => void handleDownload(file.id, file.originalName)} className="rounded border border-[#E8DCCB] px-2 py-0.5 text-xs font-black text-[#2B241E] hover:bg-[#F8F5EF]">
                      下载
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplacingFile(file)}
                      disabled={replacing}
                      className="rounded border border-[#E8DCCB] px-2 py-0.5 text-xs font-black text-[#2B241E] hover:bg-[#F8F5EF] disabled:opacity-40"
                    >
                      替换
                    </button>
                    {!file.isCurrentMain && (
                      <button
                        type="button"
                        onClick={() => void handleSetMain(file.id)}
                        disabled={settingMain !== null}
                        className="rounded border border-[#315F8C] px-2 py-0.5 text-xs font-black text-[#315F8C] hover:bg-[#E8F0FA] disabled:opacity-40"
                      >
                        设为主
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleDelete(file.id)}
                      disabled={deletingId !== null}
                      className="rounded border border-[#B42318] px-2 py-0.5 text-xs font-black text-[#B42318] hover:bg-[#FFE3E3] disabled:opacity-40"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {files.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm font-bold text-[#7A6D5E]">暂无文件</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {replacingFile ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-xl">
            <h3 className="text-lg font-black text-[#2B241E]">替换文件</h3>
            <p className="mt-2 text-sm text-[#7A6D5E]">原文件：{replacingFile.originalName}</p>
            <p className="mt-1 text-sm text-[#7A6D5E]">点击按钮选择新文件，选中后自动上传替换。</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setReplacingFile(null)} className="min-h-10 rounded-2xl border border-[#E8DCCB] px-4 text-sm font-black text-[#2B241E]">取消</button>
              <button type="button" onClick={handleReplace} disabled={replacing} className="min-h-10 rounded-2xl bg-[#315F8C] px-4 text-sm font-black text-white disabled:opacity-60">
                {replacing ? "上传中..." : "选择新文件"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function IpRevealPanel() {
  const [reason, setReason] = useState("");
  const [logs, setLogs] = useState<Array<{ id: string; createdAt: string; result: string; rawIp: string; maskedIp: string; browser: string; os: string; deviceType: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function reveal() {
    if (!reason.trim()) {
      setMessage("请填写查看原因（必填）");
      setIsError(true);
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/jeepwork/competition-center/stats?showIp=1&reason=${encodeURIComponent(reason.trim())}`, { cache: "no-store" });
      const json = (await res.json()) as { success?: boolean; data?: { logs: typeof logs }; error?: { message?: string } };
      if (!res.ok || !json.success || !json.data) {
        setMessage(json.error?.message || "获取失败");
        setIsError(true);
        return;
      }
      setLogs(json.data.logs);
      setIsError(false);
    } catch {
      setMessage("网络异常");
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid gap-4 rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-black text-[#2B241E]">完整 IP 查看（需填写原因）</h2>
        <p className="mt-1 text-sm leading-6 text-[#7A6D5E]">仅 super_admin 可用，每次查看都必须填写原因并写入审计日志。</p>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="例如：处理评委反馈 / 处理举报 / 排查异常访问"
          className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm outline-none focus:border-[#315F8C]"
        />
        <button
          type="button"
          onClick={reveal}
          disabled={loading}
          className="min-h-11 rounded-2xl bg-[#315F8C] px-6 text-sm font-black text-white disabled:opacity-60"
        >
          {loading ? "加载中..." : "查看完整 IP"}
        </button>
      </div>
      {message ? <p className={`text-sm font-black ${isError ? "text-[#B42318]" : "text-[#315F8C]"}`}>{message}</p> : null}
      {logs.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-[760px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#E8DCCB] text-[#7A6D5E]">
                <th className="py-3 pr-4">时间</th>
                <th className="py-3 pr-4">结果</th>
                <th className="py-3 pr-4">完整 IP</th>
                <th className="py-3 pr-4">脱敏 IP</th>
                <th className="py-3 pr-4">设备</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-[#F1E9DE]">
                  <td className="py-3 pr-4">{formatDate(log.createdAt)}</td>
                  <td className="py-3 pr-4 font-black text-[#315F8C]">{log.result}</td>
                  <td className="py-3 pr-4 font-mono text-[#2B241E]">{log.rawIp}</td>
                  <td className="py-3 pr-4 text-[#7A6D5E]">{log.maskedIp}</td>
                  <td className="py-3 pr-4 text-[#7A6D5E]">{log.browser}/{log.os} · {log.deviceType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function ConfigTab({ config, onRefresh }: { config: ConfigPayload; onRefresh: () => void }) {
  const [draft, setDraft] = useState<ConfigPayload>(config);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  async function save() {
    if (password || confirm) {
      if (password.length < 8) {
        setMessage("比赛访问密码至少 8 位");
        setIsError(true);
        return;
      }
      if (password !== confirm) {
        setMessage("两次输入的访问密码不一致");
        setIsError(true);
        return;
      }
    }
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/jeepwork/showcase", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: draft.enabled, sections: draft.sections, password, confirmPassword: confirm }),
      });
      const json = (await res.json()) as { success?: boolean; error?: { message?: string } };
      if (!res.ok || !json.success) {
        setMessage(json.error?.message || "保存失败");
        setIsError(true);
        return;
      }
      setPassword("");
      setConfirm("");
      setMessage("已保存总开关配置");
      setIsError(false);
      onRefresh();
    } catch {
      setMessage("网络异常");
      setIsError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="grid gap-5 rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-[#2B241E]">展示中心开关</h2>
            <p className="mt-1 text-sm leading-6 text-[#7A6D5E]">开启后仍需要评委共享密码才能访问。</p>
          </div>
          <label className="flex items-center gap-3 rounded-2xl border border-[#E8DCCB] px-4 py-3 text-sm font-black text-[#2B241E]">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
              className="size-5 accent-[#315F8C]"
            />
            比赛展示中心启用
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {SHOWCASE_V2_SECTIONS.map((key) => (
            <label key={key} className="flex items-center gap-3 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF9] px-4 py-3 text-sm font-black text-[#2B241E]">
              <input
                type="checkbox"
                checked={draft.sections[key]}
                onChange={(e) => setDraft({ ...draft, sections: { ...draft.sections, [key]: e.target.checked } })}
                className="size-5 accent-[#315F8C]"
              />
              {SHOWCASE_V2_SECTION_LABELS[key]}
            </label>
          ))}
        </div>

        <div className="grid gap-4 rounded-[24px] border border-[#E8DCCB] bg-[#F8F5EF] p-5 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-black text-[#2B241E]">
            比赛访问密码
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-4 outline-none focus:border-[#315F8C]"
              placeholder={draft.hasPassword ? "留空则不修改密码" : "至少 8 位"}
              autoComplete="new-password"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-[#2B241E]">
            确认密码
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-4 outline-none focus:border-[#315F8C]"
              placeholder="再次输入密码"
              autoComplete="new-password"
            />
          </label>
          <p className="md:col-span-2 text-xs leading-5 text-[#7A6D5E]">数据库仅保存 bcrypt 强哈希，不保存明文密码。</p>
        </div>

        {message ? <p className={`text-sm font-black ${isError ? "text-[#B42318]" : "text-[#315F8C]"}`}>{message}</p> : null}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={saving} className="min-h-11 rounded-2xl bg-[#315F8C] px-5 text-sm font-black text-white disabled:opacity-60">
            {saving ? "保存中..." : "保存配置"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ContentTab({ contents, onRefresh }: { contents: SectionContent[]; onRefresh: () => void }) {
  const [activeKey, setActiveKey] = useState<ShowcaseV2SectionKey>(contents[0]?.sectionKey || "opening");
  const active = useMemo(() => contents.find((c) => c.sectionKey === activeKey), [contents, activeKey]);
  const [draft, setDraft] = useState<SectionContent | null>(active || null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setDraft(active || null);
  }, [active]);

  function update<K extends keyof SectionContent>(key: K, value: SectionContent[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  function updateBullet(index: number, patch: Partial<ShowcaseV2Bullet>) {
    setDraft((d) => {
      if (!d) return d;
      const bullets = [...d.bullets];
      bullets[index] = { ...bullets[index], ...patch };
      return { ...d, bullets };
    });
  }
  function addBullet() {
    setDraft((d) => (d ? { ...d, bullets: [...d.bullets, { title: "" }] } : d));
  }
  function removeBullet(index: number) {
    setDraft((d) => (d ? { ...d, bullets: d.bullets.filter((_, i) => i !== index) } : d));
  }

  function updateStat(index: number, patch: Partial<ShowcaseV2Stat>) {
    setDraft((d) => {
      if (!d) return d;
      const stats = [...d.stats];
      stats[index] = { ...stats[index], ...patch };
      return { ...d, stats };
    });
  }
  function addStat() {
    setDraft((d) => (d ? { ...d, stats: [...d.stats, { label: "", value: "" }] } : d));
  }
  function removeStat(index: number) {
    setDraft((d) => (d ? { ...d, stats: d.stats.filter((_, i) => i !== index) } : d));
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/jeepwork/competition-center/content", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sectionKey: draft.sectionKey,
          eyebrow: draft.eyebrow,
          title: draft.title,
          body: draft.body,
          bullets: draft.bullets,
          stats: draft.stats,
          ctaText: draft.ctaText,
          ctaUrl: draft.ctaUrl,
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: { message?: string } };
      if (!res.ok || !json.success) {
        setMessage(json.error?.message || "保存失败");
        setIsError(true);
        return;
      }
      setMessage("章节内容已更新");
      setIsError(false);
      onRefresh();
    } catch {
      setMessage("网络异常");
      setIsError(true);
    } finally {
      setSaving(false);
    }
  }

  if (!draft) {
    return <p className="text-sm text-[#7A6D5E]">未选择章节</p>;
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-2">
        {SHOWCASE_V2_SECTIONS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveKey(key)}
            className={`min-h-10 rounded-2xl px-4 text-sm font-black transition-colors ${
              key === activeKey ? "bg-[#315F8C] text-white" : "border border-[#E8DCCB] bg-white text-[#2B241E]"
            }`}
          >
            {SHOWCASE_V2_SECTION_LABELS[key]}
          </button>
        ))}
      </div>

      <div className="grid gap-5 rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-black text-[#2B241E]">
            章节副标题（eyebrow）
            <input
              type="text"
              value={draft.eyebrow}
              onChange={(e) => update("eyebrow", e.target.value)}
              className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm outline-none focus:border-[#315F8C]"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-[#2B241E]">
            章节主标题
            <input
              type="text"
              value={draft.title}
              onChange={(e) => update("title", e.target.value)}
              className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm outline-none focus:border-[#315F8C]"
            />
          </label>
        </div>
        <label className="grid gap-2 text-sm font-black text-[#2B241E]">
          章节正文
          <textarea
            value={draft.body}
            onChange={(e) => update("body", e.target.value)}
            rows={4}
            className="rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 py-3 text-sm outline-none focus:border-[#315F8C]"
          />
        </label>

        <div className="grid gap-3 rounded-[24px] border border-[#E8DCCB] bg-[#F8F5EF] p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-[#2B241E]">列表 / 卡片项（bullets）</h3>
            <button type="button" onClick={addBullet} className="rounded-2xl border border-[#315F8C] px-3 py-1 text-xs font-black text-[#315F8C]">
              + 新增
            </button>
          </div>
          {draft.bullets.map((bullet, idx) => (
            <div key={idx} className="grid gap-2 rounded-2xl border border-[#E8DCCB] bg-white p-3 md:grid-cols-[1fr_2fr_auto]">
              <input
                value={bullet.title}
                onChange={(e) => updateBullet(idx, { title: e.target.value })}
                placeholder="标题"
                className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 text-sm outline-none focus:border-[#315F8C]"
              />
              <input
                value={bullet.description || ""}
                onChange={(e) => updateBullet(idx, { description: e.target.value })}
                placeholder="说明"
                className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 text-sm outline-none focus:border-[#315F8C]"
              />
              <button type="button" onClick={() => removeBullet(idx)} className="rounded-2xl border border-[#B42318] px-3 text-xs font-black text-[#B42318]">
                删除
              </button>
            </div>
          ))}
        </div>

        <div className="grid gap-3 rounded-[24px] border border-[#E8DCCB] bg-[#F8F5EF] p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-[#2B241E]">数字卡片（stats）</h3>
            <button type="button" onClick={addStat} className="rounded-2xl border border-[#315F8C] px-3 py-1 text-xs font-black text-[#315F8C]">
              + 新增
            </button>
          </div>
          {draft.stats.map((stat, idx) => (
            <div key={idx} className="grid gap-2 rounded-2xl border border-[#E8DCCB] bg-white p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
              <input
                value={stat.label}
                onChange={(e) => updateStat(idx, { label: e.target.value })}
                placeholder="标签"
                className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 text-sm outline-none focus:border-[#315F8C]"
              />
              <input
                value={stat.value}
                onChange={(e) => updateStat(idx, { value: e.target.value })}
                placeholder="数值"
                className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 text-sm outline-none focus:border-[#315F8C]"
              />
              <input
                value={stat.hint || ""}
                onChange={(e) => updateStat(idx, { hint: e.target.value })}
                placeholder="说明（可选）"
                className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 text-sm outline-none focus:border-[#315F8C]"
              />
              <button type="button" onClick={() => removeStat(idx)} className="rounded-2xl border border-[#B42318] px-3 text-xs font-black text-[#B42318]">
                删除
              </button>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-black text-[#2B241E]">
            章节 CTA 文字
            <input
              type="text"
              value={draft.ctaText || ""}
              onChange={(e) => update("ctaText", e.target.value || null)}
              className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm outline-none focus:border-[#315F8C]"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-[#2B241E]">
            章节 CTA 跳转地址
            <input
              type="text"
              value={draft.ctaUrl || ""}
              onChange={(e) => update("ctaUrl", e.target.value || null)}
              placeholder="如 #painPoints 或 /products/xxx"
              className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm outline-none focus:border-[#315F8C]"
            />
          </label>
        </div>

        {message ? <p className={`text-sm font-black ${isError ? "text-[#B42318]" : "text-[#315F8C]"}`}>{message}</p> : null}
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={save} disabled={saving} className="min-h-11 rounded-2xl bg-[#315F8C] px-5 text-sm font-black text-white disabled:opacity-60">
            {saving ? "保存中..." : "保存章节内容"}
          </button>
          <p className="text-xs text-[#7A6D5E]">最近更新：{formatDate(draft.updatedAt)}</p>
        </div>
      </div>
    </div>
  );
}

function SequenceTab({ sequences, onRefresh }: { sequences: Sequence[]; onRefresh: () => void }) {
  const [draft, setDraft] = useState<Sequence[]>(sequences);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setDraft(sequences);
  }, [sequences]);

  function update<K extends keyof Sequence>(index: number, key: K, value: Sequence[K]) {
    setDraft((d) => {
      const next = [...d];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  }

  function move(index: number, direction: -1 | 1) {
    setDraft((d) => {
      const target = index + direction;
      if (target < 0 || target >= d.length) return d;
      const next = [...d];
      const a = next[index];
      const b = next[target];
      if (!a || !b) return d;
      next[index] = b;
      next[target] = a;
      return next.map((s, i) => ({ ...s, orderIndex: i }));
    });
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/jeepwork/competition-center/sequence", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sequences: draft.map((s) => ({
            sectionKey: s.sectionKey,
            orderIndex: s.orderIndex,
            visible: s.visible,
            animation: s.animation,
            theme: s.theme,
            dwellSec: s.dwellSec,
            allowSwipe: s.allowSwipe,
          })),
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: { message?: string } };
      if (!res.ok || !json.success) {
        setMessage(json.error?.message || "保存失败");
        setIsError(true);
        return;
      }
      setMessage("章节顺序已保存");
      setIsError(false);
      onRefresh();
    } catch {
      setMessage("网络异常");
      setIsError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-[#2B241E]">章节顺序与可见性</h2>
        <p className="mt-1 text-sm leading-6 text-[#7A6D5E]">可调整顺序、隐藏章节、切换主题、设置自动播放停留秒数与是否允许键盘 / 触摸切换。</p>
      </div>
      <div className="grid gap-3">
        {draft.map((s, idx) => (
          <div key={s.sectionKey} className="grid gap-3 rounded-[24px] border border-[#E8DCCB] bg-white p-4 shadow-sm md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-[#315F8C]">第 {idx + 1} 章</p>
              <p className="text-base font-black text-[#2B241E]">{SHOWCASE_V2_SECTION_LABELS[s.sectionKey]}</p>
              <p className="text-xs text-[#7A6D5E]">{s.sectionKey}</p>
            </div>
            <label className="grid gap-1 text-xs font-black text-[#2B241E]">
              主题
              <select
                value={s.theme}
                onChange={(e) => update(idx, "theme", e.target.value)}
                className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 text-sm outline-none focus:border-[#315F8C]"
              >
                <option value="dark">深色（默认）</option>
                <option value="light">浅色</option>
                <option value="gradient">渐变</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-black text-[#2B241E]">
              自动播放（秒）
              <input
                type="number"
                value={s.dwellSec}
                min={0}
                max={600}
                onChange={(e) => update(idx, "dwellSec", Math.max(0, Math.min(Number(e.target.value) || 0, 600)))}
                className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 text-sm outline-none focus:border-[#315F8C]"
              />
            </label>
            <div className="grid gap-1 text-xs font-black text-[#2B241E]">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={s.visible} onChange={(e) => update(idx, "visible", e.target.checked)} className="size-4 accent-[#315F8C]" />
                显示
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={s.animation} onChange={(e) => update(idx, "animation", e.target.checked)} className="size-4 accent-[#315F8C]" />
                开启动画
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={s.allowSwipe} onChange={(e) => update(idx, "allowSwipe", e.target.checked)} className="size-4 accent-[#315F8C]" />
                允许滑动
              </label>
            </div>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} className="rounded-2xl border border-[#E8DCCB] px-3 py-1 text-xs font-black disabled:opacity-40">上移</button>
              <button type="button" onClick={() => move(idx, 1)} disabled={idx === draft.length - 1} className="rounded-2xl border border-[#E8DCCB] px-3 py-1 text-xs font-black disabled:opacity-40">下移</button>
            </div>
          </div>
        ))}
      </div>
      {message ? <p className={`text-sm font-black ${isError ? "text-[#B42318]" : "text-[#315F8C]"}`}>{message}</p> : null}
      <div>
        <button type="button" onClick={save} disabled={saving} className="min-h-11 rounded-2xl bg-[#315F8C] px-5 text-sm font-black text-white disabled:opacity-60">
          {saving ? "保存中..." : "保存章节顺序"}
        </button>
      </div>
    </div>
  );
}

function AIConfigTab({ config, onRefresh }: { config: AIConfig; onRefresh: () => void }) {
  const [draft, setDraft] = useState<AIConfig>(config);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  function setWelcome(assistant: AiAssistantTitle, value: string) {
    setDraft((d) => ({ ...d, welcomeByAssistant: { ...d.welcomeByAssistant, [assistant]: value } }));
  }
  function setQuestions(assistant: AiAssistantTitle, raw: string) {
    const list = raw
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 12);
    setDraft((d) => ({ ...d, suggestedQuestionsByAssistant: { ...d.suggestedQuestionsByAssistant, [assistant]: list } }));
  }
  function setAssistantEnabled(assistant: AiAssistantTitle, value: boolean) {
    setDraft((d) => ({ ...d, assistantEnabled: { ...d.assistantEnabled, [assistant]: value } }));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/jeepwork/competition-center/ai-config", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          enabled: draft.enabled,
          allowFreeInput: draft.allowFreeInput,
          saveRecord: draft.saveRecord,
          perVisitorLimit: draft.perVisitorLimit,
          dailyTotalLimit: draft.dailyTotalLimit,
          maxOutputLength: draft.maxOutputLength,
          timeoutMs: draft.timeoutMs,
          modelName: draft.modelName,
          welcomeByAssistant: draft.welcomeByAssistant,
          suggestedQuestionsByAssistant: draft.suggestedQuestionsByAssistant,
          assistantEnabled: draft.assistantEnabled,
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: { message?: string } };
      if (!res.ok || !json.success) {
        setMessage(json.error?.message || "保存失败");
        setIsError(true);
        return;
      }
      setMessage("AI 配置已更新");
      setIsError(false);
      onRefresh();
    } catch {
      setMessage("网络异常");
      setIsError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-[#2B241E]">比赛 AI 演示</h2>
            <p className="mt-1 text-sm leading-6 text-[#7A6D5E]">读取超级管理员配置中心的阿里云百炼 API Key，浏览器永不接触 Key。</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-black ${draft.apiKeyConfigured ? "bg-[#E5F3D5] text-[#3D6B22]" : "bg-[#FFE3E3] text-[#B42318]"}`}>
            API Key：{draft.apiKeyConfigured ? "已配置" : "未配置"}
          </span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-[#E8DCCB] px-4 py-3 text-sm font-black text-[#2B241E]">
            <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} className="size-5 accent-[#315F8C]" />
            启用 AI 演示
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-[#E8DCCB] px-4 py-3 text-sm font-black text-[#2B241E]">
            <input type="checkbox" checked={draft.allowFreeInput} onChange={(e) => setDraft({ ...draft, allowFreeInput: e.target.checked })} className="size-5 accent-[#315F8C]" />
            允许自由输入
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-[#E8DCCB] px-4 py-3 text-sm font-black text-[#2B241E]">
            <input type="checkbox" checked={draft.saveRecord} onChange={(e) => setDraft({ ...draft, saveRecord: e.target.checked })} className="size-5 accent-[#315F8C]" />
            保存演示记录
          </label>
          <label className="grid gap-1 text-xs font-black text-[#2B241E]">
            模型
            <input
              type="text"
              value={draft.modelName}
              onChange={(e) => setDraft({ ...draft, modelName: e.target.value })}
              className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 text-sm outline-none focus:border-[#315F8C]"
            />
          </label>
          <label className="grid gap-1 text-xs font-black text-[#2B241E]">
            单访客调用上限
            <input
              type="number"
              min={1}
              max={100}
              value={draft.perVisitorLimit}
              onChange={(e) => setDraft({ ...draft, perVisitorLimit: Math.max(1, Math.min(Number(e.target.value) || 0, 100)) })}
              className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 text-sm outline-none focus:border-[#315F8C]"
            />
          </label>
          <label className="grid gap-1 text-xs font-black text-[#2B241E]">
            每日总调用上限
            <input
              type="number"
              min={1}
              max={100000}
              value={draft.dailyTotalLimit}
              onChange={(e) => setDraft({ ...draft, dailyTotalLimit: Math.max(1, Math.min(Number(e.target.value) || 0, 100000)) })}
              className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 text-sm outline-none focus:border-[#315F8C]"
            />
          </label>
          <label className="grid gap-1 text-xs font-black text-[#2B241E]">
            最大输出长度
            <input
              type="number"
              min={64}
              max={8000}
              value={draft.maxOutputLength}
              onChange={(e) => setDraft({ ...draft, maxOutputLength: Math.max(64, Math.min(Number(e.target.value) || 0, 8000)) })}
              className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 text-sm outline-none focus:border-[#315F8C]"
            />
          </label>
          <label className="grid gap-1 text-xs font-black text-[#2B241E]">
            超时（毫秒）
            <input
              type="number"
              min={2000}
              max={60000}
              value={draft.timeoutMs}
              onChange={(e) => setDraft({ ...draft, timeoutMs: Math.max(2000, Math.min(Number(e.target.value) || 0, 60000)) })}
              className="min-h-10 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 text-sm outline-none focus:border-[#315F8C]"
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-[#7A6D5E]">Base URL：{draft.baseUrl} · 配置版本：{draft.configVersion}</p>
      </div>

      <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
        <h3 className="text-lg font-black text-[#2B241E]">五大 AI 助理 · 演示配置</h3>
        <p className="mt-1 text-sm leading-6 text-[#7A6D5E]">每行一个推荐问题；总长 12 条以内；欢迎语支持换行。系统提示词与版本请到「AI 调试台」维护与发布。</p>
        <div className="mt-4 grid gap-4">
          {(Object.keys(AI_ASSISTANTS) as AssistantKey[]).map((key) => (
            <div key={key} className="rounded-[24px] border border-[#E8DCCB] bg-[#F8F5EF] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-black text-[#2B241E]">{ASSISTANT_LABELS[key]}</p>
                <label className="flex items-center gap-2 text-xs font-black text-[#2B241E]">
                  <input
                    type="checkbox"
                    checked={draft.assistantEnabled[key] !== false}
                    onChange={(e) => setAssistantEnabled(AI_ASSISTANT_TITLES[key], e.target.checked)}
                    className="size-4 accent-[#315F8C]"
                  />
                  启用
                </label>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-xs font-black text-[#2B241E]">
                  欢迎语
                  <textarea
                    rows={2}
                    value={draft.welcomeByAssistant[key] || ""}
                    onChange={(e) => setWelcome(AI_ASSISTANT_TITLES[key], e.target.value)}
                    className="rounded-2xl border border-[#E8DCCB] bg-white px-3 py-2 text-sm outline-none focus:border-[#315F8C]"
                  />
                </label>
                <label className="grid gap-1 text-xs font-black text-[#2B241E]">
                  推荐问题（每行一个）
                  <textarea
                    rows={4}
                    value={(draft.suggestedQuestionsByAssistant[key] || []).join("\n")}
                    onChange={(e) => setQuestions(AI_ASSISTANT_TITLES[key], e.target.value)}
                    className="rounded-2xl border border-[#E8DCCB] bg-white px-3 py-2 text-sm outline-none focus:border-[#315F8C]"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {message ? <p className={`text-sm font-black ${isError ? "text-[#B42318]" : "text-[#315F8C]"}`}>{message}</p> : null}
      <div>
        <button type="button" onClick={save} disabled={saving} className="min-h-11 rounded-2xl bg-[#315F8C] px-5 text-sm font-black text-white disabled:opacity-60">
          {saving ? "保存中..." : "保存 AI 配置"}
        </button>
      </div>
    </div>
  );
}

function StatsTab({ stats, logs }: { stats: StatPayload; logs: Props["initialLogs"] }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[24px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-[#7A6D5E]">总访问次数</p>
          <p className="mt-2 text-3xl font-black text-[#2B241E]">{formatNumber(stats.totalVisits)}</p>
        </div>
        <div className="rounded-[24px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-[#7A6D5E]">独立访客</p>
          <p className="mt-2 text-3xl font-black text-[#2B241E]">{formatNumber(stats.uniqueVisitors)}</p>
        </div>
        <div className="rounded-[24px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-[#7A6D5E]">AI 演示调用</p>
          <p className="mt-2 text-3xl font-black text-[#2B241E]">{formatNumber(stats.demoCalls.total)}</p>
          <p className="mt-1 text-[11px] text-[#7A6D5E]">成功 {stats.demoCalls.success} · 失败 {stats.demoCalls.failed} · 平均 {stats.demoCalls.avgLatencyMs} ms</p>
        </div>
        <div className="rounded-[24px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-[#7A6D5E]">文件下载</p>
          <p className="mt-2 text-3xl font-black text-[#2B241E]">{formatNumber(stats.fileDownloads.total)}</p>
          <p className="mt-1 text-[11px] text-[#7A6D5E]">最近访问：{stats.lastVisitedAt ? formatDate(stats.lastVisitedAt) : "—"}</p>
        </div>
      </div>
      <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-[#2B241E]">访问记录</h2>
        <p className="mt-1 text-sm leading-6 text-[#7A6D5E]">保留 90 天，过期记录将在新访问写入时自动清理。完整 IP 需要在「IP 查看」标签填写原因后才返回。</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[920px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#E8DCCB] text-[#7A6D5E]">
                <th className="py-3 pr-4">时间</th>
                <th className="py-3 pr-4">结果</th>
                <th className="py-3 pr-4">来源页</th>
                <th className="py-3 pr-4">脱敏 IP</th>
                <th className="py-3 pr-4">浏览器/系统</th>
                <th className="py-3 pr-4">设备</th>
                <th className="py-3 pr-4">IP 哈希</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-[#F1E9DE] align-top">
                  <td className="py-3 pr-4 font-bold text-[#2B241E]">{formatDate(log.createdAt)}</td>
                  <td className="py-3 pr-4 font-black text-[#315F8C]">{log.result}</td>
                  <td className="max-w-[200px] truncate py-3 pr-4 text-[#7A6D5E]">{log.referrer || "—"}</td>
                  <td className="py-3 pr-4 text-[#7A6D5E]">{log.maskedIp}</td>
                  <td className="py-3 pr-4 text-[#7A6D5E]">{log.browser} / {log.os}</td>
                  <td className="py-3 pr-4 text-[#7A6D5E]">{log.deviceType}</td>
                  <td className="max-w-[180px] truncate py-3 pr-4 font-mono text-[#7A6D5E]">{log.ipHash}</td>
                </tr>
              ))}
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm font-bold text-[#7A6D5E]">暂无访问记录</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function CompetitionCenterClient({ initialConfig, initialLogs }: Props) {
  const [tab, setTab] = useState<TabKey>("config");
  const [config, setConfig] = useState<ConfigPayload>(initialConfig);
  const [contents, setContents] = useState<SectionContent[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [stats, setStats] = useState<StatPayload | null>(null);
  const [logs, setLogs] = useState<Props["initialLogs"]>(initialLogs);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function refreshConfig() {
    const res = await fetch("/api/jeepwork/showcase", { cache: "no-store" });
    const json = (await res.json()) as { success?: boolean; data?: { config: ConfigPayload; logs: Props["initialLogs"] } };
    if (json.success && json.data) {
      setConfig(json.data.config);
      setLogs(json.data.logs);
    }
  }
  async function refreshContents() {
    const res = await fetch("/api/jeepwork/competition-center/content", { cache: "no-store" });
    const json = (await res.json()) as { success?: boolean; data?: { contents: SectionContent[] } };
    if (json.success && json.data) setContents(json.data.contents);
  }
  async function refreshSequences() {
    const res = await fetch("/api/jeepwork/competition-center/sequence", { cache: "no-store" });
    const json = (await res.json()) as { success?: boolean; data?: { sequences: Sequence[] } };
    if (json.success && json.data) setSequences(json.data.sequences);
  }
  async function refreshAI() {
    const res = await fetch("/api/jeepwork/competition-center/ai-config", { cache: "no-store" });
    const json = (await res.json()) as { success?: boolean; data?: { config: AIConfig } };
    if (json.success && json.data) setAiConfig(json.data.config);
  }
  async function refreshStats() {
    const res = await fetch("/api/jeepwork/competition-center/stats", { cache: "no-store" });
    const json = (await res.json()) as { success?: boolean; data?: { stats: StatPayload } };
    if (json.success && json.data) setStats(json.data.stats);
  }

  useEffect(() => {
    void refreshContents();
    void refreshSequences();
    void refreshAI();
    void refreshStats();
  }, []);

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "config", label: "总开关" },
    { key: "content", label: "内容管理" },
    { key: "sequence", label: "章节顺序" },
    { key: "ai", label: "AI 配置" },
    { key: "files", label: "文件管理" },
    { key: "stats", label: "访问统计" },
    { key: "ip", label: "IP 查看" },
  ];

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`min-h-11 rounded-2xl px-5 text-sm font-black transition-colors ${
              tab === t.key ? "bg-[#315F8C] text-white" : "border border-[#E8DCCB] bg-white text-[#2B241E]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "config" ? <ConfigTab config={config} onRefresh={refreshConfig} /> : null}
      {tab === "content" ? <ContentTab contents={contents} onRefresh={refreshContents} /> : null}
      {tab === "sequence" ? <SequenceTab sequences={sequences} onRefresh={refreshSequences} /> : null}
      {tab === "ai" ? aiConfig ? <AIConfigTab config={aiConfig} onRefresh={refreshAI} /> : <p className="text-sm text-[#7A6D5E]">AI 配置加载中…</p> : null}
      {tab === "files" ? <FilesTab onMessage={(m, e) => { setMessage(m); setIsError(Boolean(e)); }} /> : null}
      {tab === "stats" ? stats ? <StatsTab stats={stats} logs={logs} /> : <p className="text-sm text-[#7A6D5E]">统计数据加载中…</p> : null}
      {tab === "ip" ? <IpRevealPanel /> : null}

      {message ? <p className={`text-sm ${isError ? "text-red-500" : "text-[#315F8C]"}`}>{message}</p> : null}
    </div>
  );
}

