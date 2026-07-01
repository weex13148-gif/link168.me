"use client";

import { useState, type ReactNode } from "react";
import { X } from "lucide-react";

type DashboardLayoutProps = {
  sidebar: ReactNode;
  statusBar: ReactNode;
  brand: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
  preview: ReactNode;
  emailVerificationBanner?: ReactNode;
};

export function DashboardLayout({
  sidebar,
  statusBar,
  brand,
  headerActions,
  children,
  preview,
  emailVerificationBanner,
}: DashboardLayoutProps) {
  const [showEmailBanner, setShowEmailBanner] = useState(true);

  return (
    <main
      data-dashboard-v1
      className="min-h-dvh overflow-x-hidden bg-[radial-gradient(circle_at_12%_10%,rgba(221,232,205,0.72),transparent_24%),radial-gradient(circle_at_88%_14%,rgba(200,164,93,0.12),transparent_20%),linear-gradient(135deg,#FFFDF8_0%,#F7F1E7_52%,#F2E7D8_100%)] text-[#2B241E] [&_button[title='组件市场']]:hidden"
    >
      {emailVerificationBanner && showEmailBanner ? (
        <div className="relative">
          {emailVerificationBanner}
          <button
            type="button"
            onClick={() => setShowEmailBanner(false)}
            className="absolute right-3 top-3 z-[60] grid size-8 place-items-center rounded-full border border-[#E8DCCB] bg-white/90 text-[#7A6D5E] shadow-sm hover:bg-white sm:right-5"
            aria-label="关闭邮箱验证提醒"
            title="关闭当前提醒"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
      ) : null}

      <header className="sticky top-0 z-40 border-b border-[#E8DCCB]/90 bg-[#FFFDF8]/90 px-3 py-2 backdrop-blur sm:px-6 sm:py-3 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1760px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">{brand}</div>
          <div className="flex min-w-0 items-center gap-2">
            {statusBar}
            {headerActions}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1760px] px-3 py-5 pb-20 sm:px-6 sm:py-7 sm:pb-24 lg:px-8 lg:pb-8 xl:px-10">
        <div className="grid gap-5 lg:grid-cols-[270px_minmax(0,1fr)_390px] lg:gap-8 xl:grid-cols-[290px_minmax(520px,1fr)_420px] xl:gap-10 2xl:grid-cols-[300px_minmax(620px,1fr)_440px]">
          <aside className="hidden lg:sticky lg:top-20 lg:block lg:h-[calc(100dvh-6rem)]">
            {sidebar}
          </aside>

          <section className="grid min-w-0 content-start gap-5 sm:gap-6">{children}</section>

          <aside className="hidden min-w-0 lg:sticky lg:top-20 lg:block lg:h-[calc(100dvh-6rem)]">
            {preview}
          </aside>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E8DCCB]/90 bg-[#FFFDF8]/95 px-2 py-2 backdrop-blur lg:hidden safe-area-pb">
        {sidebar}
      </div>
    </main>
  );
}
