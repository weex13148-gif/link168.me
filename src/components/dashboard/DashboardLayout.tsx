import type { ReactNode } from "react";

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
  return (
    <main className="min-h-dvh overflow-x-hidden bg-[radial-gradient(circle_at_12%_10%,rgba(221,232,205,0.72),transparent_24%),radial-gradient(circle_at_88%_14%,rgba(200,164,93,0.12),transparent_20%),linear-gradient(135deg,#FFFDF8_0%,#F7F1E7_52%,#F2E7D8_100%)] text-[#2B241E]">
      {emailVerificationBanner}
      <header className="sticky top-0 z-40 border-b border-[#E8DCCB]/90 bg-[#FFFDF8]/90 px-3 py-2 backdrop-blur sm:px-6 sm:py-3 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">{brand}</div>
          <div className="flex min-w-0 items-center gap-2">
            {statusBar}
            {headerActions}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1400px] px-3 py-4 pb-20 sm:px-6 sm:py-6 sm:pb-24 lg:px-8 lg:pb-6">
        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_420px] lg:gap-6 xl:grid-cols-[280px_minmax(0,1fr)_440px]">
          <aside className="hidden lg:sticky lg:top-20 lg:block lg:h-[calc(100dvh-6rem)]">
            {sidebar}
          </aside>

          <section className="grid content-start gap-4 sm:gap-5">{children}</section>

          <aside className="hidden lg:sticky lg:top-20 lg:block lg:h-[calc(100dvh-6rem)]">
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
