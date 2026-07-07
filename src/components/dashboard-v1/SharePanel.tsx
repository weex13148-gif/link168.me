"use client";

import Link from "next/link";
import { Copy, Download, ExternalLink, QrCode, Share2 } from "lucide-react";

export function SharePanel({
  publicUrl,
  username,
  displayName,
  onCopy,
  onShare,
  onQr,
}: {
  publicUrl: string;
  username: string;
  displayName: string;
  onCopy: () => void;
  onShare: () => void;
  onQr: () => void;
}) {
  const qrCodeUrl = publicUrl
    ? `/api/qrcode?url=${encodeURIComponent(publicUrl)}&size=420&dark=29251F&light=FFFDFA&margin=2&filename=${encodeURIComponent(username || "link168")}_qrcode`
    : "";

  return (
    <div className="grid gap-5">
      <header>
        <p className="ui-eyebrow">分享与二维码</p>
        <h1 className="mt-1 text-2xl ui-title sm:text-3xl">把主页发送给客户</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 ui-muted">这里仅提供真实公开地址和二维码，不生成短码，也不会改写你的链接。</p>
      </header>

      {!publicUrl ? (
        <section className="ui-surface grid min-h-64 place-items-center p-8 text-center">
          <div>
            <QrCode className="mx-auto size-10 text-[var(--ui-faint)]" />
            <h2 className="mt-4 text-xl ui-title">尚未设置公开地址</h2>
            <p className="mt-2 text-sm ui-muted">请先在“名片资料”中设置公开主页地址，再生成二维码。</p>
          </div>
        </section>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="ui-surface p-5 sm:p-6">
            <p className="ui-eyebrow">公开地址</p>
            <h2 className="mt-2 break-all text-2xl ui-title">{publicUrl}</h2>
            <p className="mt-3 text-sm leading-6 ui-muted">复制后可以放在社交媒体简介、聊天名片、海报和线下物料中。</p>

            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={onCopy} className="ui-button-secondary"><Copy className="size-4" />复制地址</button>
              <Link href={publicUrl} target="_blank" rel="noopener noreferrer" className="ui-button-secondary"><ExternalLink className="size-4" />打开主页</Link>
              <button type="button" onClick={onShare} className="ui-button-primary"><Share2 className="size-4" />系统分享</button>
            </div>

            <div className="mt-8 border-t border-[var(--ui-line)] pt-6">
              <h3 className="font-black">分享建议</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[var(--ui-line)] bg-[var(--ui-surface-strong)] p-4"><p className="text-sm font-black">社交媒体简介</p><p className="mt-2 text-xs leading-5 ui-muted">将主页地址放进抖音、小红书、公众号或个人资料。</p></div>
                <div className="rounded-xl border border-[var(--ui-line)] bg-[var(--ui-surface-strong)] p-4"><p className="text-sm font-black">线下物料</p><p className="mt-2 text-xs leading-5 ui-muted">下载二维码，用于名片、展架、海报或门店桌牌。</p></div>
              </div>
            </div>
          </section>

          <section className="ui-surface p-5 text-center sm:p-6">
            <p className="ui-eyebrow">主页二维码</p>
            <h2 className="mt-1 text-lg ui-title">{displayName || `@${username}`}</h2>
            <div className="mx-auto mt-5 w-fit rounded-[18px] border border-[var(--ui-line)] bg-[var(--ui-surface-strong)] p-3 shadow-[var(--ui-shadow-sm)]">
              <img src={qrCodeUrl} alt={`${displayName || username} 的主页二维码`} className="size-56 rounded-xl" />
            </div>
            <p className="mt-4 text-xs ui-muted">扫码直接打开 {publicUrl}</p>
            <div className="mt-5 grid gap-2">
              <a href={qrCodeUrl} download={`${username}_qrcode.png`} className="ui-button-primary w-full"><Download className="size-4" />下载二维码</a>
              <button type="button" onClick={onQr} className="ui-button-secondary w-full"><QrCode className="size-4" />放大查看</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
