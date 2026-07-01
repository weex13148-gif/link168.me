import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

const footerLinks = [
  { label: "用户协议", href: "/terms" },
  { label: "隐私政策", href: "/privacy" },
  { label: "举报中心", href: "/report" },
  { label: "帮助中心", href: "/help" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--ui-line)] bg-[var(--ui-surface)] py-8 text-sm text-[var(--ui-muted)]">
      <div className="ui-container grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <BrandLogo size="footer" className="!w-[92px]" />
          <p className="mt-3 font-bold text-[var(--ui-ink)]">个人数字名片与客户入口整理工具</p>
          <p className="mt-1 max-w-xl leading-6">集中展示内容、服务和联系方式，让客户通过一个公开地址找到你。</p>
        </div>

        <div className="grid gap-4 md:justify-items-end">
          <nav className="flex flex-wrap gap-x-5 gap-y-2 font-bold" aria-label="页脚导航">
            {footerLinks.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-[var(--ui-brand-hover)]">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" className="transition hover:text-[var(--ui-brand-hover)]">
              皖ICP备2026018031号-1
            </a>
            <span>合肥造梦哈勃文化传媒有限公司</span>
            <span>© 2026 link168.me</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
