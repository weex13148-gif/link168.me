"use client";

import { Camera, Save, Trash2, UserRound } from "lucide-react";
import type { DashboardProfile, SaveState } from "@/components/dashboard-v1/types";
import { isTemporaryUsername } from "@/components/dashboard-v1/types";

export function ProfilePanel({ profile, username, displayName, bio, saveState, uploadingAvatar, onUsernameChange, onDisplayNameChange, onBioChange, onSave, onUploadAvatar, onDeleteAvatar }: {
  profile: DashboardProfile | null;
  username: string;
  displayName: string;
  bio: string;
  saveState: SaveState;
  uploadingAvatar: boolean;
  onUsernameChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onBioChange: (value: string) => void;
  onSave: (event: React.FormEvent<HTMLFormElement>) => void;
  onUploadAvatar: (file: File | null) => void;
  onDeleteAvatar: () => void;
}) {
  const canSetUsername = !profile || isTemporaryUsername(profile.username);
  const avatarModerationLabel = profile?.avatar_moderation_status === "approved" || profile?.avatar_moderation_status === "legacy_approved"
    ? "已通过"
    : profile?.avatar_moderation_status === "rejected"
      ? "未通过"
      : "待人工审核（待配置验证）";

  return (
    <div className="grid gap-5">
      <header><p className="ui-eyebrow">名片资料</p><h1 className="mt-1 text-2xl ui-title sm:text-3xl">编辑你的公开身份</h1><p className="mt-2 max-w-2xl text-sm leading-6 ui-muted">访客会在公开主页顶部看到头像、名称和简介。保存后才会更新线上主页。</p></header>
      <form onSubmit={onSave} className="ui-surface p-5 sm:p-6">
        <div className="grid gap-7 xl:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <p className="text-sm font-black">头像</p>
            <div className="mt-3 flex items-center gap-4 xl:block">
              <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-[24px] border border-[var(--ui-line)] bg-[var(--ui-brand-soft)] text-[var(--ui-brand-hover)] xl:size-36">
                {profile?.avatar_url ? (
                  <>
                    <img
                      key={profile.avatar_url}
                      src={profile.avatar_url}
                      alt="当前头像"
                      className="size-full object-cover"
                      decoding="async"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                        const fallback = event.currentTarget.nextElementSibling;
                        if (fallback instanceof HTMLElement) fallback.classList.remove("hidden");
                      }}
                    />
                    <span className="hidden text-2xl font-black">{(displayName || username || "L").slice(0, 1).toUpperCase()}</span>
                  </>
                ) : <UserRound className="size-11 xl:size-14" />}
              </div>
              <div className="xl:mt-4">
                <label className="ui-button-secondary cursor-pointer"><Camera className="size-4" />{uploadingAvatar ? "正在上传…" : "更换头像"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={uploadingAvatar} onChange={(event) => { onUploadAvatar(event.target.files?.[0] || null); event.currentTarget.value = ""; }} /></label>
                {profile?.avatar_url ? <button type="button" disabled={uploadingAvatar} onClick={() => { if (window.confirm("确定删除当前头像吗？")) onDeleteAvatar(); }} className="ui-button-quiet mt-2 text-[var(--ui-danger)] disabled:opacity-50"><Trash2 className="size-4" />删除头像</button> : null}
                <p className="mt-2 text-xs leading-5 ui-muted">支持 JPG、PNG、WebP、GIF，最大 2MB。审核通过后公开展示。</p>
                {profile?.avatar_url ? <p className="mt-1 text-xs leading-5 ui-muted">审核状态：{avatarModerationLabel}</p> : null}
              </div>
            </div>
          </div>
          <div className="grid gap-5">
            <label className="grid gap-2"><span className="text-sm font-black">公开主页地址</span><div className={`flex min-h-12 items-center rounded-xl border bg-white px-3 ${canSetUsername ? "border-[var(--ui-line)] focus-within:border-[var(--ui-brand)] focus-within:ring-4 focus-within:ring-[color:var(--ui-brand)]/10" : "border-[var(--ui-line)] bg-[var(--ui-surface-muted)]"}`}><span className="shrink-0 text-sm font-bold text-[var(--ui-muted)]">link168.me/</span><input value={username} onChange={(event) => onUsernameChange(event.target.value.replace(/[^a-z0-9_-]/gi, "").toLowerCase())} placeholder="例如：abao" disabled={!canSetUsername} maxLength={32} className="min-w-0 flex-1 bg-transparent px-1.5 text-sm font-black outline-none disabled:text-[var(--ui-muted)]" /></div><span className="text-xs leading-5 ui-muted">{canSetUsername ? "仅支持小写字母、数字、下划线和短横线。首次保存后地址会锁定，避免旧链接失效。" : "公开地址已锁定。需要变更时请通过账户页面联系平台处理。"}</span></label>
            <label className="grid gap-2"><span className="text-sm font-black">显示名称</span><input value={displayName} onChange={(event) => onDisplayNameChange(event.target.value)} maxLength={50} placeholder="例如：阿宝的名片" className="ui-input" /><span className="text-right text-xs ui-muted">{displayName.length}/50</span></label>
            <label className="grid gap-2"><span className="text-sm font-black">个人简介</span><textarea value={bio} onChange={(event) => onBioChange(event.target.value)} maxLength={160} rows={5} placeholder="用一两句话介绍你提供的内容、服务或联系方式。" className="rounded-xl border border-[var(--ui-line)] bg-white p-3.5 text-sm leading-6 outline-none transition focus:border-[var(--ui-brand)] focus:ring-4 focus:ring-[color:var(--ui-brand)]/10" /><span className="text-right text-xs ui-muted">{bio.length}/160</span></label>
            <div className="flex flex-col-reverse gap-3 border-t border-[var(--ui-line)] pt-5 sm:flex-row sm:items-center sm:justify-between"><p className={`text-sm font-bold ${saveState === "error" ? "text-[var(--ui-danger)]" : "text-[var(--ui-muted)]"}`}>{saveState === "dirty" ? "资料有未保存修改。" : saveState === "saving" ? "正在保存资料…" : saveState === "error" ? "保存失败，请检查提示后重试。" : "当前资料已保存。"}</p><button type="submit" disabled={saveState === "saving"} className="ui-button-primary sm:min-w-32"><Save className="size-4" />{saveState === "saving" ? "保存中…" : "保存资料"}</button></div>
          </div>
        </div>
      </form>
    </div>
  );
}
