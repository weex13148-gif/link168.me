"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Crown, Loader2, X } from "lucide-react";

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
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [showUpgradeGuide, setShowUpgradeGuide] = useState(false);
  const [upgradeExpanded, setUpgradeExpanded] = useState(false);

  useEffect(() => {
    try {
      setShowUpgradeGuide(window.localStorage.getItem("link168-v1-upgrade-guide-seen") !== "1");
    } catch {
      setShowUpgradeGuide(true);
    }
  }, []);

  useEffect(() => {
    const matchedRoot = document.querySelector<HTMLElement>("main[data-dashboard-v1]");
    if (!matchedRoot) return;
    const rootElement: HTMLElement = matchedRoot;

    function cleanV1Placeholders() {
      rootElement.querySelectorAll<HTMLInputElement>('input[placeholder="yourname"]').forEach((input) => {
        input.placeholder = "例如：abao";
      });

      const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        if (node.nodeValue?.includes("link168.me/yourname")) {
          node.nodeValue = node.nodeValue.replaceAll("link168.me/yourname", "尚未设置公开地址");
        }
        node = walker.nextNode();
      }

      rootElement.querySelectorAll<HTMLElement>("section").forEach((section) => {
        const heading = section.textContent || "";
        if (heading.includes("链接与短码") || heading.includes("快速生成专属短链接")) {
          section.style.display = "none";
        }
      });
    }

    cleanV1Placeholders();
    const observer = new MutationObserver(cleanV1Placeholders);
    observer.observe(rootElement, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  function dismissUpgradeGuide() {
    setShowUpgradeGuide(false);
    try {
      window.localStorage.setItem("link168-v1-upgrade-guide-seen", "1");
    } catch {
      // 浏览器禁用本地存储时，仅关闭当前提示。
    }
  }

  async function handleFileChangeCapture(event: FormEvent<HTMLElement>) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== "file" || !input.accept.includes("image/")) return;
    const file = input.files?.[0];
    if (!file) return;

    event.stopPropagation();
    setAvatarMessage("");
    if (file.size > 2 * 1024 * 1024) {
      setAvatarMessage("头像图片不能超过 2MB。");
      input.value = "";
      return;
    }

    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const response = await fetch("/api/dashboard/avatar", { method: "POST", body: formData });
      const result = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || !result.success) {
        setAvatarMessage(result.error || "头像上传失败，请稍后重试。");
        return;
      }
      setAvatarMessage("头像上传成功，正在刷新预览…");
      window.setTimeout(() => window.location.reload(), 500);
    } catch {
      setAvatarMessage("网络连接失败，头像上传未完成。");
    } finally {
      setAvatarUploading(false);
      input.value = "";
    }
  }

  return (
    <main
      data-dashboard-v1
      onChangeCapture={handleFileChangeCapture}
      className="min-h-dvh overflow-x-hidden bg-[radial-gradient(circle_at_12%_10%,rgba(221,232,205,0.72),transparent_24%),radial-gradient(circle_at_88%_14%,rgba(200,164,93,0.12),transparent_20%),linear-gradient(135deg,#FFFDF8_0%,#F7F1E7_52%,#F2E7D8_100%)] text-[#2B241E] [&_button[title='组件市场']]:hidden"
    >
      <style>{`
        main[data-dashboard-v1] section:has(> div > button:first-child[class*="bg-[#DDE8CD]"] + button[class*="bg-[#EAF3FF]"]) { display: none; }
        main[data-dashboard-v1] button[class*="bg-[#EAF3FF]"] { display: none; }
      `}</style>

      {emailVerificationBanner && showEmailBanner ? (
        <div className="relative">
          {emailVerificationBanner}
          <button type="button" onClick={() => setShowEmailBanner(false)} className="absolute right-3 top-3 z-[60] grid size-8 place-items-center rounded-full border border-[#E8DCCB] bg-white/90 text-[#7A6D5E] shadow-sm hover:bg-white sm:right-5" aria-label="关闭邮箱验证提醒" title="关闭当前提醒">
            <X aria-hidden className="size-4" />
          </button>
        </div>
      ) : null}

      {showUpgradeGuide ? (
        <aside className="fixed bottom-20 right-4 z-[75] w-[min(92vw,390px)] rounded-[24px] border border-[#E2D2B5] bg-[#FFFDF8] p-5 shadow-[0_24px_70px_rgba(86,68,46,0.20)] lg:bottom-6">
          <button type="button" onClick={dismissUpgradeGuide} className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-[#F2E7D8] text-[#7A6D5E]" aria-label="关闭会员说明"><X className="size-4" /></button>
          <div className="flex items-center gap-3 pr-9">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#F6E7C8] text-[#8C612E]"><Crown className="size-5" /></span>
            <div><p className="text-sm font-black text-[#8C612E]">Link168 版本说明</p><h2 className="text-lg font-black">按需要选择适合你的版本</h2></div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-[#F7F1E7] p-3"><p className="font-black">免费版</p><p className="mt-1 text-[#7A6D5E]">主页与基础链接</p></div>
            <div className="rounded-xl bg-[#EEF4E7] p-3"><p className="font-black text-[#355126]">会员版</p><p className="mt-1 text-[#4F633F]">188 元/年</p></div>
            <div className="rounded-xl bg-[#EEF3FF] p-3"><p className="font-black text-[#334E9E]">企业版</p><p className="mt-1 text-[#5F6F9F]">团队与 AI 服务</p></div>
          </div>
          {upgradeExpanded ? (
            <div className="mt-3 rounded-xl bg-white p-3 text-xs leading-6 text-[#6F6255]">
              <p><strong>会员版：</strong>高级主题、自定义装修、访问数据与高级二维码。</p>
              <p><strong>企业版：</strong>企业资料库、AI 助手、团队服务与更高使用额度。</p>
              <p className="mt-1">可在“账户与安全 → 升级会员”中再次查看。</p>
            </div>
          ) : null}
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setUpgradeExpanded((value) => !value)} className="min-h-10 flex-1 rounded-xl bg-[#6F8F4E] px-4 text-sm font-black text-white">{upgradeExpanded ? "收起说明" : "查看版本区别"}</button>
            <button type="button" onClick={dismissUpgradeGuide} className="min-h-10 rounded-xl border border-[#E8DCCB] bg-white px-4 text-sm font-black text-[#6F6255]">暂不提醒</button>
          </div>
        </aside>
      ) : null}

      {avatarUploading || avatarMessage ? (
        <div className={`fixed right-4 top-20 z-[80] flex max-w-sm items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold shadow-xl ${avatarMessage.includes("成功") ? "border-[#CFE0BF] bg-[#EEF4E7] text-[#355126]" : "border-[#E8DCCB] bg-white text-[#7A6D5E]"}`}>
          {avatarUploading ? <Loader2 className="size-4 animate-spin" /> : null}
          {avatarUploading ? "正在上传头像…" : avatarMessage}
          {!avatarUploading && avatarMessage ? <button type="button" onClick={() => setAvatarMessage("")} className="ml-2"><X className="size-4" /></button> : null}
        </div>
      ) : null}

      <header className="sticky top-0 z-40 border-b border-[#E8DCCB]/90 bg-[#FFFDF8]/90 px-3 py-2 backdrop-blur sm:px-6 sm:py-3 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1760px] items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2">{brand}</div><div className="flex min-w-0 items-center gap-2">{statusBar}{headerActions}</div></div>
      </header>

      <div className="mx-auto w-full max-w-[1760px] px-3 py-5 pb-20 sm:px-6 sm:py-7 sm:pb-24 lg:px-8 lg:pb-8 xl:px-10">
        <div className="grid gap-5 lg:grid-cols-[270px_minmax(0,1fr)_390px] lg:gap-8 xl:grid-cols-[290px_minmax(520px,1fr)_420px] xl:gap-10 2xl:grid-cols-[300px_minmax(620px,1fr)_440px]">
          <aside className="hidden lg:sticky lg:top-20 lg:block lg:h-[calc(100dvh-6rem)]">{sidebar}</aside>
          <section className="grid min-w-0 content-start gap-5 sm:gap-6">{children}</section>
          <aside className="hidden min-w-0 lg:sticky lg:top-20 lg:block lg:h-[calc(100dvh-6rem)]">{preview}</aside>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E8DCCB]/90 bg-[#FFFDF8]/95 px-2 py-2 backdrop-blur lg:hidden safe-area-pb">{sidebar}</div>
    </main>
  );
}
