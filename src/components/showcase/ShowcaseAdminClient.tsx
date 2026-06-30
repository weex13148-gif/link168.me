"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// ============== 类型定义 ==============

type SectionKey =
  | "projectIntro"
  | "startupStory"
  | "productDemo"
  | "agentProcess"
  | "realEvidence"
  | "businessModel"
  | "roadmap"
  | "ppt"
  | "video"
  | "businessReport"
  | "contact";

type ShowcaseConfigPayload = {
  enabled: boolean;
  hasPassword: boolean;
  updatedAt: string | null;
  sections: Record<SectionKey, boolean>;
  sectionLabels: Record<SectionKey, string>;
};

type ShowcaseLog = {
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
  screenSize: string | null;
  viewportSize: string | null;
  deviceModel: string | null;
};

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

type FileApiPayload = {
  success?: boolean;
  data?: { files: CompetitionFile[] };
  error?: { message?: string };
};

type FileApiSinglePayload = {
  success?: boolean;
  data?: { id: string; originalName: string; mimeType: string; sizeBytes: number; purpose: string; description: string | null; isCurrentMain: boolean; uploadedByEmail: string; createdAt: string; message?: string };
  error?: { message?: string };
};

const PURPOSE_LABELS: Record<string, string> = {
  competition_ppt: "比赛路演 PPT",
  project_pdf: "项目介绍 PDF",
  demo_video: "演示视频",
  product_screenshot: "产品截图",
  judge_doc: "评委资料",
  backup: "备用文件",
};

const PURPOSE_OPTIONS = [
  { value: "competition_ppt", label: "比赛路演 PPT" },
  { value: "project_pdf", label: "项目介绍 PDF" },
  { value: "demo_video", label: "演示视频" },
  { value: "product_screenshot", label: "产品截图" },
  { value: "judge_doc", label: "评委资料" },
  { value: "backup", label: "备用文件" },
];

// ============== 文件管理标签页组件 ==============

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function CompetitionFileTab() {
  const [files, setFiles] = useState<CompetitionFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 上传表单状态
  const [uploadPurpose, setUploadPurpose] = useState("backup");
  const [uploadDescription, setUploadDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 修改说明对话框状态
  const [editingFile, setEditingFile] = useState<CompetitionFile | null>(null);
  const [editPurpose, setEditPurpose] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // 替换对话框状态
  const [replacingFile, setReplacingFile] = useState<CompetitionFile | null>(null);
  const [replacing, setReplacing] = useState(false);

  // 加载文件列表
  async function loadFiles() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/jeepwork/competition-files", { cache: "no-store" });
      const result = (await response.json()) as FileApiPayload;
      if (!response.ok || !result.success || !result.data) {
        setMessage(result.error?.message || "读取文件列表失败");
        setIsError(true);
        return;
      }
      setFiles(result.data.files);
    } catch {
      setMessage("网络异常，读取失败");
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFiles();
  }, []);

  // 上传文件
  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fileInputRef.current?.files?.length) {
      setMessage("请选择要上传的文件");
      setIsError(true);
      return;
    }

    const selectedFile = fileInputRef.current.files[0];
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("purpose", uploadPurpose);
    if (uploadDescription.trim()) {
      formData.append("description", uploadDescription.trim());
    }

    setUploading(true);
    setMessage("");

    try {
      const response = await fetch("/api/jeepwork/competition-files", {
        method: "POST",
        cache: "no-store",
        body: formData,
      });
      const result = (await response.json()) as FileApiSinglePayload;

      if (!response.ok || !result.success) {
        setMessage(result.error?.message || "上传失败");
        setIsError(true);
        return;
      }

      setMessage(result.data?.message || "文件上传成功");
      setIsError(false);
      setUploadDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadFiles();
    } catch {
      setMessage("网络异常，上传失败");
      setIsError(true);
    } finally {
      setUploading(false);
    }
  }

  // 下载文件
  async function handleDownload(fileId: string, originalName: string) {
    try {
      const response = await fetch(`/api/jeepwork/competition-files/${fileId}/download`, { cache: "no-store" });
      if (!response.ok) {
        const text = await response.text();
        alert(`下载失败：${text || "文件不存在"}`);
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = originalName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("下载失败，请稍后重试");
    }
  }

  // 删除文件
  async function handleDelete(fileId: string, originalName: string) {
    const confirmed = window.confirm(`确定要删除文件「${originalName}」吗？此操作不可撤销。`);
    if (!confirmed) return;

    setMessage("");
    try {
      const response = await fetch(`/api/jeepwork/competition-files/${fileId}`, {
        method: "DELETE",
        cache: "no-store",
      });
      const result = (await response.json()) as FileApiSinglePayload;
      if (!response.ok || !result.success) {
        setMessage(result.error?.message || "删除失败");
        setIsError(true);
        return;
      }
      setMessage("文件已删除");
      setIsError(false);
      await loadFiles();
    } catch {
      setMessage("网络异常，删除失败");
      setIsError(true);
    }
  }

  // 替换文件
  async function handleReplace() {
    if (!replacingFile) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pptx,.pdf,.docx,.xlsx,.png,.jpg,.jpeg,.webp,.mp4,.zip";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      setReplacing(true);
      setMessage("");
      try {
        const response = await fetch(`/api/jeepwork/competition-files/${replacingFile.id}/replace`, {
          method: "POST",
          cache: "no-store",
          body: formData,
        });
        const result = (await response.json()) as FileApiSinglePayload;
        if (!response.ok || !result.success) {
          setMessage(result.error?.message || "替换失败");
          setIsError(true);
          setReplacing(false);
          return;
        }
        setMessage("文件已替换成功");
        setIsError(false);
        setReplacingFile(null);
        await loadFiles();
      } catch {
        setMessage("网络异常，替换失败");
        setIsError(true);
      } finally {
        setReplacing(false);
      }
    };
    input.click();
  }

  // 设置为主文件
  async function handleSetMain(fileId: string) {
    setMessage("");
    try {
      const response = await fetch(`/api/jeepwork/competition-files/${fileId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "set-main" }),
        cache: "no-store",
      });
      const result = (await response.json()) as FileApiSinglePayload;
      if (!response.ok || !result.success) {
        setMessage(result.error?.message || "设置失败");
        setIsError(true);
        return;
      }
      setMessage("已设置为主文件");
      setIsError(false);
      await loadFiles();
    } catch {
      setMessage("网络异常，设置失败");
      setIsError(true);
    }
  }

  // 打开修改说明对话框
  function openEditDialog(file: CompetitionFile) {
    setEditingFile(file);
    setEditPurpose(file.purpose);
    setEditDescription(file.description || "");
    setEditSaving(false);
  }

  // 保存修改说明
  async function handleSaveEdit() {
    if (!editingFile) return;
    setEditSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/jeepwork/competition-files/${editingFile.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "update-meta", purpose: editPurpose, description: editDescription }),
        cache: "no-store",
      });
      const result = (await response.json()) as FileApiSinglePayload;
      if (!response.ok || !result.success) {
        setMessage(result.error?.message || "保存失败");
        setIsError(true);
        return;
      }
      setMessage("文件信息已更新");
      setIsError(false);
      setEditingFile(null);
      await loadFiles();
    } catch {
      setMessage("网络异常，保存失败");
      setIsError(true);
    } finally {
      setEditSaving(false);
    }
  }

  const purposeOptions = PURPOSE_OPTIONS;

  return (
    <div className="grid gap-6">
      {/* 上传表单 */}
      <form onSubmit={handleUpload} className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-black text-[#2B241E]">上传比赛文件</h3>
        <p className="mb-4 text-xs leading-5 text-[#7A6D5E]">
          支持 PPTX / PDF / DOCX / XLSX / PNG / JPG / WEBP / MP4 / ZIP，单个文件最大 500MB。
          仅 super_admin 可操作。
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-black text-[#2B241E]">
            选择文件
            <input
              ref={fileInputRef}
              type="file"
              accept=".pptx,.pdf,.docx,.xlsx,.png,.jpg,.jpeg,.webp,.mp4,.zip"
              required
              className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm outline-none focus:border-[#315F8C]"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-[#2B241E]">
            文件用途
            <select
              value={uploadPurpose}
              onChange={(e) => setUploadPurpose(e.target.value)}
              className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm outline-none focus:border-[#315F8C]"
            >
              {purposeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-black text-[#2B241E] md:col-span-2">
            文件说明（可选）
            <input
              type="text"
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              maxLength={200}
              placeholder="如：V1.2 版本、2026年6月更新..."
              className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm outline-none focus:border-[#315F8C]"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={uploading}
            className="min-h-11 rounded-2xl bg-[#315F8C] px-6 text-sm font-black text-white disabled:opacity-60"
          >
            {uploading ? "上传中..." : "上传文件"}
          </button>
          {message ? (
            <span className={`text-sm font-black ${isError ? "text-[#B42318]" : "text-[#315F8C]"}`}>{message}</span>
          ) : null}
        </div>
      </form>

      {/* 修改说明对话框 */}
      {editingFile ? (
        <div className="rounded-[28px] border border-[#315F8C] bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-black text-[#2B241E]">修改文件「{editingFile.originalName}」信息</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-black text-[#2B241E]">
              文件用途
              <select
                value={editPurpose}
                onChange={(e) => setEditPurpose(e.target.value)}
                className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm outline-none focus:border-[#315F8C]"
              >
                {purposeOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-black text-[#2B241E]">
              文件说明
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                maxLength={200}
                placeholder="可留空"
                className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm outline-none focus:border-[#315F8C]"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={editSaving}
              className="min-h-11 rounded-2xl bg-[#315F8C] px-6 text-sm font-black text-white disabled:opacity-60"
            >
              {editSaving ? "保存中..." : "保存"}
            </button>
            <button
              type="button"
              onClick={() => setEditingFile(null)}
              className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-6 text-sm font-black text-[#2B241E]"
            >
              取消
            </button>
          </div>
        </div>
      ) : null}

      {/* 替换确认 */}
      {replacingFile ? (
        <div className="rounded-[28px] border border-[#B42318] bg-white p-6 shadow-sm">
          <h3 className="mb-2 text-lg font-black text-[#2B241E]">替换文件「{replacingFile.originalName}」</h3>
          <p className="mb-4 text-xs leading-5 text-[#7A6D5E]">替换将保留旧文件记录，新文件将作为新版本。点击&quot;选择新文件&quot;继续。</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleReplace}
              disabled={replacing}
              className="min-h-11 rounded-2xl bg-[#B42318] px-6 text-sm font-black text-white disabled:opacity-60"
            >
              {replacing ? "替换中..." : "选择新文件并替换"}
            </button>
            <button
              type="button"
              onClick={() => setReplacingFile(null)}
              className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-6 text-sm font-black text-[#2B241E]"
            >
              取消
            </button>
          </div>
        </div>
      ) : null}

      {/* 文件列表 */}
      <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-[#2B241E]">比赛文件列表</h3>
            <p className="mt-1 text-xs leading-5 text-[#7A6D5E]">所有文件存储在受保护目录，仅 super_admin 可下载。</p>
          </div>
          <button
            type="button"
            onClick={() => void loadFiles()}
            disabled={loading}
            className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E] disabled:opacity-60"
          >
            刷新列表
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm font-bold text-[#7A6D5E]">正在加载文件列表...</p>
        ) : files.length === 0 ? (
          <p className="py-8 text-center text-sm font-bold text-[#7A6D5E]">暂无文件，请上传第一个比赛文件。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8DCCB] text-[#7A6D5E]">
                  <th className="py-3 pr-4">主文件</th>
                  <th className="py-3 pr-4">文件名</th>
                  <th className="py-3 pr-4">用途</th>
                  <th className="py-3 pr-4">大小</th>
                  <th className="py-3 pr-4">说明</th>
                  <th className="py-3 pr-4">上传人</th>
                  <th className="py-3 pr-4">上传时间</th>
                  <th className="py-3 pr-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id} className="border-b border-[#F1E9DE] align-top">
                    <td className="py-3 pr-4">
                      {file.isCurrentMain ? (
                        <span className="rounded-full bg-[#6F8F4E] px-3 py-1 text-xs font-black text-white">主文件</span>
                      ) : (
                        <span className="text-[#7A6D5E]">-</span>
                      )}
                    </td>
                    <td className="max-w-[200px] py-3 pr-4 font-bold text-[#2B241E]">
                      <span className="block truncate" title={file.originalName}>{file.originalName}</span>
                      <span className="text-[10px] text-[#7A6D5E]">{file.mimeType}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full bg-[#F2EDE3] px-2 py-1 text-xs font-bold text-[#7A6D5E]">
                        {PURPOSE_LABELS[file.purpose] || file.purpose}
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 font-bold text-[#2B241E]">
                      {formatBytes(file.sizeBytes)}
                    </td>
                    <td className="max-w-[160px] py-3 pr-4 text-[#7A6D5E]">
                      <span className="block truncate" title={file.description || ""}>{file.description || "-"}</span>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 text-[#7A6D5E]">{file.uploadedByEmail}</td>
                    <td className="whitespace-nowrap py-3 pr-4 font-bold text-[#2B241E]">{formatDate(file.createdAt)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => void handleDownload(file.id, file.originalName)}
                          className="rounded-2xl bg-[#315F8C] px-3 py-2 text-xs font-black text-white"
                        >
                          下载
                        </button>
                        {!file.isCurrentMain ? (
                          <button
                            type="button"
                            onClick={() => void handleSetMain(file.id)}
                            className="rounded-2xl border border-[#6F8F4E] px-3 py-2 text-xs font-bold text-[#6F8F4E]"
                          >
                            设为主文件
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => openEditDialog(file)}
                          className="rounded-2xl border border-[#E8DCCB] px-3 py-2 text-xs font-bold text-[#2B241E]"
                        >
                          修改
                        </button>
                        <button
                          type="button"
                          onClick={() => setReplacingFile(file)}
                          className="rounded-2xl border border-[#E8DCCB] px-3 py-2 text-xs font-bold text-[#2B241E]"
                        >
                          替换
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(file.id, file.originalName)}
                          className="rounded-2xl border border-[#B42318] px-3 py-2 text-xs font-black text-[#B42318]"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ============== 原有配置管理标签页 ==============

type ApiPayload = {
  success?: boolean;
  data?: { config: ShowcaseConfigPayload; logs: ShowcaseLog[] };
  error?: { message?: string };
};

export default function ShowcaseAdminClient() {
  const [config, setConfig] = useState<ShowcaseConfigPayload | null>(null);
  const [logs, setLogs] = useState<ShowcaseLog[]>([]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"config" | "files">("config");

  const sectionKeys = useMemo(() => (config ? (Object.keys(config.sections) as SectionKey[]) : []), [config]);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setMessage("");
    try {
      const response = await fetch("/api/jeepwork/showcase", { cache: "no-store" });
      const result = (await response.json()) as ApiPayload;
      if (!response.ok || !result.success || !result.data) {
        setMessage(result.error?.message || "读取比赛展示中心配置失败");
        return;
      }
      setConfig(result.data.config);
      setLogs(result.data.logs);
    } catch {
      setMessage("网络异常，读取失败");
    }
  }

  function updateSection(key: SectionKey, checked: boolean) {
    if (!config) return;
    setConfig({ ...config, sections: { ...config.sections, [key]: checked } });
  }

  async function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!config) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/jeepwork/showcase", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          enabled: config.enabled,
          sections: config.sections,
          password,
          confirmPassword,
        }),
      });
      const result = (await response.json()) as ApiPayload;
      if (!response.ok || !result.success || !result.data) {
        setMessage(result.error?.message || "保存失败");
        return;
      }
      setConfig(result.data.config);
      setLogs(result.data.logs);
      setPassword("");
      setConfirmPassword("");
      setMessage("已保存比赛展示中心配置");
    } catch {
      setMessage("网络异常，保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (!config) {
    return (
      <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 text-sm font-bold text-[#7A6D5E] shadow-sm">
        {message || "正在读取比赛展示中心配置..."}
      </section>
    );
  }

  return (
    <div className="grid gap-6">
      {/* 标签切换 */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("config")}
          className={`min-h-11 rounded-2xl px-6 text-sm font-black transition-colors ${
            activeTab === "config"
              ? "bg-[#315F8C] text-white"
              : "border border-[#E8DCCB] bg-white text-[#2B241E]"
          }`}
        >
          配置管理
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("files")}
          className={`min-h-11 rounded-2xl px-6 text-sm font-black transition-colors ${
            activeTab === "files"
              ? "bg-[#315F8C] text-white"
              : "border border-[#E8DCCB] bg-white text-[#2B241E]"
          }`}
        >
          比赛文件
        </button>
      </div>

      {activeTab === "files" ? (
        <CompetitionFileTab />
      ) : (
        <>
          <form onSubmit={onSave} className="grid gap-5 rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-[#2B241E]">展示中心开关</h2>
                <p className="mt-1 text-sm leading-6 text-[#7A6D5E]">默认关闭。开启后仍需要评委共享密码才能访问 `/showcase`。</p>
              </div>
              <label className="flex items-center gap-3 rounded-2xl border border-[#E8DCCB] px-4 py-3 text-sm font-black text-[#2B241E]">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(event) => setConfig({ ...config, enabled: event.target.checked })}
                  className="size-5 accent-[#315F8C]"
                />
                比赛展示中心启用
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {sectionKeys.map((key) => (
                <label key={key} className="flex items-center gap-3 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF9] px-4 py-3 text-sm font-black text-[#2B241E]">
                  <input
                    type="checkbox"
                    checked={config.sections[key]}
                    onChange={(event) => updateSection(key, event.target.checked)}
                    className="size-5 accent-[#315F8C]"
                  />
                  {config.sectionLabels[key]}
                </label>
              ))}
            </div>

            <div className="grid gap-4 rounded-[24px] border border-[#E8DCCB] bg-[#F8F5EF] p-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-[#2B241E]">
                比赛访问密码
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-4 outline-none focus:border-[#315F8C]"
                  placeholder={config.hasPassword ? "留空则不修改密码" : "至少 8 位"}
                  autoComplete="new-password"
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-[#2B241E]">
                确认密码
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-4 outline-none focus:border-[#315F8C]"
                  placeholder="再次输入密码"
                  autoComplete="new-password"
                />
              </label>
              <p className="md:col-span-2 text-xs leading-5 text-[#7A6D5E]">
                数据库仅保存 bcrypt 强哈希，不保存明文密码。展示登录允许立即重试，不启用验证码、IP 限流、账号锁定或失败次数封禁。
              </p>
            </div>

            {message ? <p className="text-sm font-black text-[#315F8C]">{message}</p> : null}
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={saving} className="min-h-11 rounded-2xl bg-[#315F8C] px-5 text-sm font-black text-white disabled:opacity-60">
                {saving ? "保存中..." : "保存配置"}
              </button>
              <button type="button" onClick={load} className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-5 text-sm font-black text-[#2B241E]">
                刷新日志
              </button>
            </div>
          </form>

          <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-[#2B241E]">访问记录</h2>
                <p className="mt-1 text-sm leading-6 text-[#7A6D5E]">保留 90 天，过期访问记录会在新访问写入时自动清理。原始 IP 仅在本 super_admin 页面显示。</p>
              </div>
              <span className="rounded-full bg-[#F8F5EF] px-3 py-1 text-xs font-black text-[#7A6D5E]">最近 {logs.length} 条</span>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-[1180px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E8DCCB] text-[#7A6D5E]">
                    <th className="py-3 pr-4">时间</th>
                    <th className="py-3 pr-4">结果</th>
                    <th className="py-3 pr-4">来源页</th>
                    <th className="py-3 pr-4">原始 IP</th>
                    <th className="py-3 pr-4">脱敏 IP</th>
                    <th className="py-3 pr-4">浏览器/系统</th>
                    <th className="py-3 pr-4">设备</th>
                    <th className="py-3 pr-4">屏幕/视口</th>
                    <th className="py-3 pr-4">IP 哈希</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-[#F1E9DE] align-top">
                      <td className="py-3 pr-4 font-bold text-[#2B241E]">{new Date(log.createdAt).toLocaleString("zh-CN")}</td>
                      <td className="py-3 pr-4 font-black text-[#315F8C]">{log.result}</td>
                      <td className="max-w-[180px] truncate py-3 pr-4 text-[#7A6D5E]">{log.referrer || "-"}</td>
                      <td className="py-3 pr-4 font-bold text-[#2B241E]">{log.rawIp}</td>
                      <td className="py-3 pr-4 text-[#7A6D5E]">{log.maskedIp}</td>
                      <td className="py-3 pr-4 text-[#7A6D5E]">{log.browser} / {log.os}</td>
                      <td className="py-3 pr-4 text-[#7A6D5E]">{log.deviceType}{log.deviceModel ? ` · ${log.deviceModel}` : ""}</td>
                      <td className="py-3 pr-4 text-[#7A6D5E]">{log.screenSize || "-"} / {log.viewportSize || "-"}</td>
                      <td className="max-w-[180px] truncate py-3 pr-4 font-mono text-[#7A6D5E]">{log.ipHash}</td>
                    </tr>
                  ))}
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-sm font-bold text-[#7A6D5E]">暂无访问记录</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
