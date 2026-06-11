import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";
import { SiteFooter } from "@/components/SiteFooter";

type LegalPageProps = {
  title: string;
  children: React.ReactNode;
};

export function LegalPage({ title, children }: LegalPageProps) {
  return (
    <>
      <main className="mx-auto min-h-dvh w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <LogoMark />
          <Link href="/" className="text-sm font-bold text-[#5B6FFF]">
            返回首页
          </Link>
        </div>
        <article className="mt-8 rounded-lg border border-[#E0E0E0] bg-white p-5 text-sm leading-7 text-[#4A4A4A] shadow-sm sm:p-7">
          <h1 className="text-3xl font-black text-[#1A1A1A]">{title}</h1>
          <div className="mt-6 space-y-5">{children}</div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
