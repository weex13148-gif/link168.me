import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[#E0E0E0] bg-white px-4 py-6 text-xs leading-6 text-[#8C8C8C] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2">
        <nav className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/terms" className="hover:text-[#5B6FFF]">
            用户协议
          </Link>
          <Link href="/privacy" className="hover:text-[#5B6FFF]">
            隐私政策
          </Link>
          <Link href="/report" className="hover:text-[#5B6FFF]">
            举报中心
          </Link>
        </nav>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <a href="#" className="hover:text-[#5B6FFF]">
            皖ICP备XXXXXXXX号
          </a>
          <a href="#" className="hover:text-[#5B6FFF]">
            皖公网安备 XXXXXXXXXXXXXX号
          </a>
        </div>
        <p>合肥市造梦哈勃文化传媒有限公司</p>
        <p>Copyright © 2026 link168.me</p>
      </div>
    </footer>
  );
}
