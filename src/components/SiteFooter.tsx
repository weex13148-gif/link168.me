import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export function SiteFooter() {
  return (
    <footer id="about" className="border-t border-[#DDE8CF] bg-[#F7F6EA] px-4 py-8 text-sm text-[#52624A] sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 md:grid-cols-[1fr_1.4fr] md:items-start">
        <div>
          <BrandLogo size="footer" />
          <p className="mt-4 text-lg font-black text-[#113A1D]">Link168 链接一路发</p>
          <p className="mt-2 text-sm leading-6">让世界通过一个链接认识你。</p>
        </div>
        <div className="grid gap-4">
          <nav className="flex flex-wrap gap-x-5 gap-y-2 font-bold text-[#14532D]">
            <Link href="/terms" className="hover:text-[#16A34A]">
              用户协议
            </Link>
            <Link href="/privacy" className="hover:text-[#16A34A]">
              隐私政策
            </Link>
            <Link href="/report" className="hover:text-[#16A34A]">
              举报中心
            </Link>
            <Link href="/#help" className="hover:text-[#16A34A]">
              帮助中心
            </Link>
          </nav>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
            <a href="#" className="hover:text-[#16A34A]">
              皖ICP备XXXXXXXX号
            </a>
            <a href="#" className="hover:text-[#16A34A]">
              皖公网安备 XXXXXXXXXXXXXX号
            </a>
          </div>
          <p className="text-xs">合肥市造梦哈勃文化传媒有限公司</p>
          <p className="text-xs">Copyright © 2026 link168.me</p>
        </div>
      </div>
    </footer>
  );
}
