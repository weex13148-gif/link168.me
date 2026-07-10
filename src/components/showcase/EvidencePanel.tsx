"use client";

import { useEffect, useState } from "react";
import { Image, Video, FileText, MessageSquare, HelpCircle, Clock, Database, Eye, Download } from "lucide-react";
import { EVIDENCE_INVENTORY, type EvidenceItem } from "@/lib/showcase-config";
import StatusBadge, { type ShowcaseStatus } from "./StatusBadge";

const CATEGORY_ICON: Record<EvidenceItem["category"], typeof Image> = {
  screenshot: Image,
  video: Video,
  record: FileText,
  feedback: MessageSquare,
  other: HelpCircle,
};

const CATEGORY_LABEL: Record<EvidenceItem["category"], string> = {
  screenshot: "页面证据",
  video: "视频证据",
  record: "构建记录",
  feedback: "用户反馈",
  other: "其他证据",
};

const EVIDENCE_SOURCES: Record<string, { name: string; desensitized: boolean }> = {
  "ev-home": { name: "产品首页快照", desensitized: true },
  "ev-dashboard": { name: "后台编辑页面", desensitized: true },
  "ev-modules": { name: "模块编辑流程", desensitized: true },
  "ev-theme": { name: "主题配置快照", desensitized: true },
  "ev-profile": { name: "公开主页快照", desensitized: true },
  "ev-ai": { name: "AI 对话记录", desensitized: true },
  "ev-payment": { name: "支付沙箱记录", desensitized: true },
  "ev-moderation": { name: "内容审核系统", desensitized: true },
  "ev-test": { name: "测试验收记录", desensitized: false },
  "ev-git": { name: "Git 提交记录", desensitized: false },
  "ev-demo-video": { name: "产品演示视频", desensitized: true },
  "ev-judge-video": { name: "评委备用视频", desensitized: true },
  "ev-interview": { name: "用户访谈记录", desensitized: true },
  "ev-feedback": { name: "用户反馈汇总", desensitized: true },
  "ev-intent": { name: "合作意向记录", desensitized: true },
};

interface UploadedFileInfo {
  id: string;
  originalName: string;
  createdAt?: string;
  version?: string;
}

export default function EvidencePanel() {
  const [files, setFiles] = useState<Map<string, UploadedFileInfo>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/showcase/files", { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json() as { success?: boolean; data?: { files?: Array<{ id: string; originalName: string; purpose: string; createdAt?: string }> } };
        if (json.success && json.data?.files) {
          const map = new Map<string, UploadedFileInfo>();
          json.data.files.forEach((f) => {
            EVIDENCE_INVENTORY.forEach((ev) => {
              const key = ev.name.replace(/截图|视频|记录|反馈/g, "").trim();
              if (f.originalName.includes(key) || f.originalName.includes(ev.id)) {
                const versionMatch = f.originalName.match(/_v(\d+)/);
                map.set(ev.id, {
                  id: f.id,
                  originalName: f.originalName,
                  createdAt: f.createdAt,
                  version: versionMatch ? `v${versionMatch[1]}` : "v1",
                });
              }
            });
          });
          setFiles(map);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const providedCount = EVIDENCE_INVENTORY.filter((ev) => files.has(ev.id)).length;

  return (
    <section id="evidence" className="scroll-mt-20 border-b border-[var(--ui-line)] bg-[var(--ui-surface)] py-14 sm:py-16">
      <div className="ui-container">
        <div className="grid gap-7 lg:grid-cols-[0.72fr_1.28fr] lg:gap-12">
          <div>
            <p className="ui-eyebrow">证据材料</p>
            <h2 className="ui-title mt-3 text-3xl leading-tight sm:text-4xl">所有关键结论都有实际证据支持</h2>
            <p className="ui-muted mt-4 leading-7">
              缺少材料时标记“未提供”，禁止生成虚假证据。评委、投资人和政府人员可在此查看已上传的真实材料。
            </p>
            <div className="ui-surface mt-6 grid grid-cols-2 divide-x divide-[var(--ui-line)] overflow-hidden">
              <div className="p-5">
                <p className="text-xs font-black text-[var(--ui-muted)]">材料总数</p>
                <p className="mt-2 text-3xl font-black">{EVIDENCE_INVENTORY.length}</p>
              </div>
              <div className="p-5">
                <p className="text-xs font-black text-[var(--ui-muted)]">已具备</p>
                <p className="mt-2 text-3xl font-black text-[var(--ui-brand)]">{providedCount}</p>
              </div>
            </div>
          </div>
          <div className="grid gap-4">
            {EVIDENCE_INVENTORY.map((ev) => {
              const Icon = CATEGORY_ICON[ev.category];
              const uploaded = files.get(ev.id);
              const source = EVIDENCE_SOURCES[ev.id];
              const status: ShowcaseStatus = uploaded ? "completed" : "pending";

              return (
                <div key={ev.id} className={`ui-surface overflow-hidden ${uploaded ? "border-[var(--ui-brand)]" : ""}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ui-line)] px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 place-items-center rounded-[var(--ui-radius-sm)] bg-[var(--ui-brand-soft)]">
                        <Icon className="size-5 text-[var(--ui-brand)]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black">{ev.name}</h3>
                        <span className="text-xs text-[var(--ui-muted)]">{CATEGORY_LABEL[ev.category]}</span>
                      </div>
                    </div>
                    <StatusBadge status={status} />
                  </div>
                  <div className="p-5">
                    <p className="text-sm leading-6 text-[var(--ui-muted)] mb-4">{ev.description}</p>
                    <div className="grid gap-3 text-xs sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <Database className="size-3.5 text-[var(--ui-faint)]" />
                        <span className="text-[var(--ui-muted)]">来源：</span>
                        <span className="font-bold">{source?.name || "系统生成"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="size-3.5 text-[var(--ui-faint)]" />
                        <span className="text-[var(--ui-muted)]">脱敏：</span>
                        <span className={source?.desensitized ? "text-[var(--ui-success)]" : "text-[var(--ui-warning)]"}>
                          {source?.desensitized ? "已脱敏" : "原始数据"}
                        </span>
                      </div>
                      {uploaded && uploaded.createdAt ? (
                        <div className="flex items-center gap-2">
                          <Clock className="size-3.5 text-[var(--ui-faint)]" />
                          <span className="text-[var(--ui-muted)]">生成：</span>
                          <span className="font-bold">{new Date(uploaded.createdAt).toLocaleDateString()}</span>
                        </div>
                      ) : null}
                      {uploaded && uploaded.version ? (
                        <div className="flex items-center gap-2">
                          <span className="size-3.5 flex items-center justify-center text-[var(--ui-faint)]">◇</span>
                          <span className="text-[var(--ui-muted)]">版本：</span>
                          <span className="font-bold">{uploaded.version}</span>
                        </div>
                      ) : null}
                    </div>
                    {uploaded ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <a href={`/api/showcase/files/${uploaded.id}/download`} className="ui-button-primary min-h-9 px-4 text-xs flex items-center gap-2">
                          <Download className="size-3" />
                          下载 · {uploaded.originalName}
                        </a>
                        <button type="button" className="ui-button-secondary min-h-9 px-4 text-xs">
                          查看详情
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-[var(--ui-radius-sm)] bg-[var(--ui-surface-muted)] px-4 py-3 text-xs text-[var(--ui-muted)]">
                        暂无可公开证据
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="ui-surface p-5 text-center">
                <p className="text-sm font-bold text-[var(--ui-muted)]">正在加载证据清单…</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}