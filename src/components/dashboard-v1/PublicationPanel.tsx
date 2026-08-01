"use client";

import { Copy, Eye, EyeOff, Loader2, QrCode, Share2 } from "lucide-react";

type Props = {
  isPublic: boolean;
  firstPublishedAt: string | null;
  language: string;
  contactVisibility: string;
  publicUrl: string;
  username: string;
  displayName: string;
  saving: boolean;
  onSave: (settings: { isPublic?: boolean; language?: string; contactVisibility?: string }) => Promise<boolean>;
  onCopy: () => void;
  onShare: () => void;
  onQr: () => void;
};

export function PublicationPanel({ isPublic, firstPublishedAt, language, contactVisibility, publicUrl, username, displayName, saving, onSave, onCopy, onShare, onQr }: Props) {
  const publishedAt = firstPublishedAt ? new Date(firstPublishedAt).toLocaleString("zh-CN", { hour12: false }) : null;
  return (
    <section className="grid gap-5">
      <div className={`ui-surface p-5 sm:p-6 ${isPublic ? "border-[var(--ui-success)]/25" : ""}`}>
        <div className="flex items-start gap-3">
          <span className={`grid size-11 place-items-center rounded-2xl ${isPublic ? "bg-[var(--ui-success-soft)] text-[var(--ui-success)]" : "bg-[var(--ui-surface-muted)] text-[var(--ui-muted)]"}`}>{isPublic ? <Eye className="size-5" /> : <EyeOff className="size-5" />}</span>
          <div className="min-w-0 flex-1"><p className="text-lg font-black">{isPublic ? "名片已公开" : "名片尚未公开"}</p><p className="mt-1 text-sm ui-muted">{isPublic ? `${displayName || username || "你的名片"} 已可被访客访问。` : "确认资料和联系方式后，再将名片发布给访客。"}</p>{publishedAt ? <p className="mt-2 text-xs ui-muted">首次发布：{publishedAt}</p> : null}</div>
        </div>
        <button type="button" disabled={saving || !username} onClick={() => void onSave({ isPublic: !isPublic, language, contactVisibility })} className="ui-button-primary mt-5 w-full disabled:opacity-45">{saving ? <Loader2 className="size-4 animate-spin" /> : isPublic ? <EyeOff className="size-4" /> : <Eye className="size-4" />}{saving ? "保存中" : isPublic ? "下线名片" : "发布名片"}</button>
      </div>
      <div className="ui-surface p-5 sm:p-6"><p className="ui-eyebrow">分享名片</p><h2 className="mt-1 text-xl font-black">让客户找到你</h2><p className="mt-2 break-all text-sm ui-muted">{publicUrl || "请先完成公开地址设置。"}</p><div className="mt-5 grid gap-3 sm:grid-cols-3"><button type="button" onClick={onCopy} disabled={!isPublic || !publicUrl} className="ui-button-secondary disabled:opacity-45"><Copy className="size-4" />复制链接</button><button type="button" onClick={onQr} disabled={!isPublic || !publicUrl} className="ui-button-secondary disabled:opacity-45"><QrCode className="size-4" />名片二维码</button><button type="button" onClick={onShare} disabled={!isPublic || !publicUrl} className="ui-button-secondary disabled:opacity-45"><Share2 className="size-4" />系统分享</button></div></div>
    </section>
  );
}
