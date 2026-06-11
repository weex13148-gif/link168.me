import Link from "next/link";

export function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-3 font-black tracking-tight">
      <span className="grid size-9 place-items-center rounded-lg bg-[#5B6FFF] text-sm text-white shadow-sm">
        L
      </span>
      {!compact ? (
        <span className="text-lg">
          Link<span className="text-[#5B6FFF]">1688</span>
        </span>
      ) : null}
    </Link>
  );
}
