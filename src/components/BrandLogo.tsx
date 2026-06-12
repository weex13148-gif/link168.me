import Image from "next/image";
import Link from "next/link";

type BrandLogoSize = "header" | "compact" | "footer";

type BrandLogoProps = {
  size?: BrandLogoSize;
  className?: string;
};

const sizeClasses: Record<BrandLogoSize, string> = {
  header: "w-[168px] max-w-[48vw]",
  compact: "w-[120px] max-w-[42vw]",
  footer: "w-[108px] max-w-[38vw]",
};

export function BrandLogo({ size = "header", className = "" }: BrandLogoProps) {
  return (
    <Link
      href="/"
      aria-label="Link168 链接一路发"
      className={`inline-flex shrink-0 cursor-pointer items-center transition duration-200 hover:scale-[1.025] hover:brightness-105 active:scale-[0.98] ${sizeClasses[size]} ${className}`}
    >
      <Image
        src="/brand/link168-logo.png"
        alt="Link168 链接一路发"
        width={1536}
        height={864}
        priority={size === "header"}
        sizes={size === "header" ? "168px" : size === "compact" ? "120px" : "108px"}
        className="h-auto w-full object-contain"
      />
    </Link>
  );
}
