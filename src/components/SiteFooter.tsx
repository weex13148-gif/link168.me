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
    <footer id="about" className="border-t border-[#E4E8E0] bg-[#F6F7F2] px-4 py-10 text-sm text-[#667063] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <BrandLogo size="footer" />
          <p className="mt-4 max-w-md text-sm leading-7">
            用一个专属主页，整理你的内容、服务与生意，让每一次分享都有清楚的下一步。
          </p>
        </div>

        <div className="grid gap-5 lg:justify-items-end">
          <nav className="flex flex-wrap gap-x-6 gap-y-3 font-semibold text-[#364034]">
            {footerLinks.map(({ label, href }) => (
              <Link key={label} href={href} className="transition hover:text-[#587744]">
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" className="transition hover:text-[#587744]">
              皖ICP备2026018031号-1
            </a>
            <span>合肥造梦哈勃文化传媒有限公司</span>
          </div>
          <p className="text-xs">Copyright © 2026 link168.me</p>
        </div>
      </div>
    </footer>
  );
}
