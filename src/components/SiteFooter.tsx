import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { COMPANY_NAME, COPYRIGHT_YEAR, GONGAN_LINK, GONGAN_NUMBER, ICP_LINK, ICP_NUMBER } from "@/lib/legal/meta";

const footerLinks = [
  { label: "用户协议", href: "/terms" },
  { label: "隐私政策", href: "/privacy" },
  { label: "会员服务协议", href: "/membership-agreement" },
  { label: "退款规则", href: "/refund-policy" },
  { label: "AI 免责声明", href: "/ai-disclaimer" },
  { label: "帮助中心", href: "/help" },
  { label: "联系客服", href: "/contact" },
  { label: "举报中心", href: "/report" },
  { label: "账号注销", href: "/account-cancellation" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--ui-line)] bg-[var(--ui-surface)] py-8 text-sm text-[var(--ui-muted)]">
      <div className="ui-container grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <BrandLogo size="footer" className="!w-[92px]" />
          <p className="mt-3 font-bold text-[var(--ui-ink)]">个人经营名片与客户线索入口</p>
          <p className="mt-1 max-w-xl leading-6">
            集中展示身份、内容、产品服务和联系方式，让客户通过一个公开地址找到你。
          </p>
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
            <a href={ICP_LINK} target="_blank" rel="noreferrer" className="transition hover:text-[var(--ui-brand-hover)]">
              {ICP_NUMBER}
            </a>
            {GONGAN_NUMBER && GONGAN_LINK ? (
              <a href={GONGAN_LINK} target="_blank" rel="noreferrer" className="transition hover:text-[var(--ui-brand-hover)]">
                {GONGAN_NUMBER}
              </a>
            ) : null}
            <span>{COMPANY_NAME}</span>
            <span>(c) {COPYRIGHT_YEAR} link168.me</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
