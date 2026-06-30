import Link from "next/link";
import { BookOpenText, FileText, ShieldAlert } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const footerLinks = [
  { label: "用户协议", href: "/terms", icon: FileText },
  { label: "隐私政策", href: "/privacy", icon: ShieldAlert },
  { label: "举报中心", href: "/report", icon: ShieldAlert },
  { label: "帮助中心", href: "/help", icon: BookOpenText },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[#e5e7eb] bg-[#f9fafb] px-4 py-8 text-sm text-[#6b7280] sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 md:grid-cols-[1fr_1.4fr] md:items-start">
        <div>
          <BrandLogo size="footer" />
          <p className="mt-4 text-lg font-bold text-[#1f1f2e]">Link168 连接美好生活</p>
          <p className="mt-2 text-sm leading-6">用一个链接，整理你的内容、服务与生意。</p>
        </div>
        <div className="grid gap-4">
          <nav className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {footerLinks.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="link168-card-hover link168-button-press group flex min-h-14 items-center gap-3 rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-[15px] font-semibold text-[#1f1f2e] shadow-sm"
              >
                <span className="link168-card-icon link168-wiggle-on-hover grid size-9 shrink-0 place-items-center rounded-xl bg-[#f5f3ff] text-[#8b5cf6] transition group-hover:bg-[#8b5cf6]/20 group-hover:text-[#8b5cf6]">
                  <Icon aria-hidden className="link168-nav-icon" />
                </span>
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#8b5cf6]"
            >
              皖ICP备2026018031号-1
            </a>
            <a href="#" className="hover:text-[#8b5cf6]">
              皖公网安备 XXXXXXXXXXXXXX号
            </a>
          </div>
          <p className="text-xs">合肥造梦哈勃文化传媒有限公司</p>
          <p className="text-xs">Copyright © 2026 link168.me</p>
        </div>
      </div>
    </footer>
  );
}
