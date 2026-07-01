"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Download, FileText, ShieldCheck } from "lucide-react";
import {
  COMPETITION_DEMO_FLOW,
  COMPETITION_FINAL_CHECKS,
  COMPETITION_MATERIALS,
  COMPETITION_PAGE_CONTENT,
} from "@/lib/competition-materials";

type UploadedFile = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  purpose: string;
  description: string | null;
  isCurrentMain: boolean;
  createdAt: string;
};

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.ceil(bytes / 1024)} KB`;
}

export default function CompetitionMaterialsSection() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/showcase/files", { cache: "no-store" })
      .then(async (response) => ({ response, result: await response.json() as { success?: boolean; data?: { files?: UploadedFile[] }; error?: { message?: string } } }))
      .then(({ response, result }) => {
        if (cancelled) return;
        if (!response.ok || !result.success) setError(result.error?.message || "比赛资料暂时无法加载。");
        else setFiles(result.data?.files || []);
      })
      .catch(() => { if (!cancelled) setError("网络连接失败，比赛资料暂时无法加载。"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const uploadedByPurpose = useMemo(() => {
    const map = new Map<string, UploadedFile[]>();
    files.forEach((file) => map.set(file.purpose, [...(map.get(file.purpose) || []), file]));
    return map;
  }, [files]);

  const requiredCount = COMPETITION_MATERIALS.filter((item) => item.required).length;
  const readyCount = COMPETITION_MATERIALS.filter((item) => item.required && (uploadedByPurpose.get(item.purpose)?.length || 0) > 0).length;

  return (
    <section id="competition-materials" className="scroll-mt-20 border-b border-[var(--ui-line)] bg-[var(--ui-surface)] py-14 sm:py-16">
      <div className="ui-container">
        <div className="grid gap-7 lg:grid-cols-[0.72fr_1.28fr] lg:gap-12">
          <div>
            <p className="ui-eyebrow">比赛资料</p>
            <h2 className="ui-title mt-3 text-3xl leading-tight sm:text-4xl">评委需要的文件、内容和演示顺序集中在这里</h2>
            <p className="ui-muted mt-4 leading-7">资料文件由超级管理员上传，只有通过比赛共享密码进入的评委才能查看和下载。页面同时列出尚需准备的材料，避免把缺失文件误写成已完成。</p>
            <div className="ui-surface mt-6 grid grid-cols-2 divide-x divide-[var(--ui-line)] overflow-hidden">
              <div className="p-5"><p className="text-xs font-black text-[var(--ui-muted)]">必需资料</p><p className="mt-2 text-3xl font-black">{requiredCount}</p></div>
              <div className="p-5"><p className="text-xs font-black text-[var(--ui-muted)]">已具备类型</p><p className="mt-2 text-3xl font-black text-[var(--ui-brand)]">{readyCount}</p></div>
            </div>
          </div>

          <div className="grid gap-5">
            <section className="ui-surface overflow-hidden">
              <div className="flex items-center justify-between gap-4 border-b border-[var(--ui-line)] px-5 py-4">
                <div><h3 className="font-black">决赛文件清单</h3><p className="ui-muted mt-1 text-xs">上传状态按服务器比赛文件库实时判断</p></div>
                <FileText className="size-5 text-[var(--ui-brand)]" />
              </div>
              <div className="divide-y divide-[var(--ui-line)]">
                {COMPETITION_MATERIALS.map((item) => {
                  const uploaded = uploadedByPurpose.get(item.purpose) || [];
                  return (
                    <div key={item.id} className="grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm">{item.name}</strong>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${item.required ? "bg-[var(--ui-accent-soft)] text-[#7D5B24]" : "bg-[var(--ui-surface-muted)] text-[var(--ui-muted)]"}`}>{item.required ? "必需" : "建议"}</span>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${uploaded.length ? "bg-[var(--ui-success-soft)] text-[var(--ui-success)]" : "bg-[var(--ui-danger-soft)] text-[var(--ui-danger)]"}`}>{uploaded.length ? `已上传 ${uploaded.length}` : "待上传"}</span>
                        </div>
                        <p className="ui-muted mt-2 text-sm leading-6">{item.description}</p>
                        <p className="mt-2 text-xs text-[var(--ui-faint)]">建议格式：{item.format} · 负责人：{item.owner}</p>
                      </div>
                      <div className="grid gap-2 sm:min-w-44">
                        {uploaded.slice(0, 3).map((file) => (
                          <a key={file.id} href={`/api/showcase/files/${file.id}/download`} className="ui-button-secondary min-h-10 justify-between px-3 text-xs" title={file.originalName}>
                            <span className="max-w-28 truncate">{file.isCurrentMain ? "主文件 · " : ""}{file.originalName}</span>
                            <span className="flex items-center gap-1 text-[var(--ui-muted)]"><Download className="size-3.5" />{formatSize(file.sizeBytes)}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {loading ? <p className="border-t border-[var(--ui-line)] px-5 py-4 text-sm font-bold text-[var(--ui-muted)]">正在读取已上传资料…</p> : null}
              {error ? <p className="border-t border-[var(--ui-line)] bg-[var(--ui-danger-soft)] px-5 py-4 text-sm font-bold text-[var(--ui-danger)]">{error}</p> : null}
            </section>

            <div className="grid gap-5 xl:grid-cols-3">
              <Checklist title="页面必须包含" items={COMPETITION_PAGE_CONTENT} />
              <Checklist title="现场演示顺序" items={COMPETITION_DEMO_FLOW} />
              <Checklist title="提交前最终检查" items={COMPETITION_FINAL_CHECKS} secure />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Checklist({ title, items, secure = false }: { title: string; items: readonly string[]; secure?: boolean }) {
  return (
    <section className="ui-surface-plain overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--ui-line)] px-4 py-3">
        {secure ? <ShieldCheck className="size-4 text-[var(--ui-brand)]" /> : <Check className="size-4 text-[var(--ui-brand)]" />}
        <h3 className="text-sm font-black">{title}</h3>
      </div>
      <ol className="divide-y divide-[var(--ui-line)]">
        {items.map((item, index) => <li key={item} className="flex gap-3 px-4 py-3 text-xs leading-5"><span className="font-mono font-black text-[var(--ui-faint)]">{String(index + 1).padStart(2, "0")}</span><span className="text-[var(--ui-muted)]">{item}</span></li>)}
      </ol>
    </section>
  );
}
